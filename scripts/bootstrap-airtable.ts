/**
 * Cria as tabelas Guests, Gifts, Purchases num base Airtable pré-existente,
 * adiciona linked records & rollup ClaimedCount, depois popula o seed.
 *
 * Pré-requisitos:
 *   1. Criar base Airtable (manual no app.airtable.com — schema.bases:write
 *      NÃO permite criar bases, só editar) ou via `npm run airtable:create-base`
 *      (requer plano c/ enterprise scope — provavelmente manual).
 *   2. Gerar Personal Access Token c/ scopes:
 *        - data.records:read, data.records:write
 *        - schema.bases:read, schema.bases:write
 *      Restringir o token à base criada.
 *   3. Setar `AIRTABLE_API_KEY` & `AIRTABLE_BASE_ID` em `.env`.
 *
 * Uso: `npm run airtable:bootstrap`
 */
import "dotenv/config";
import { TABLE_DEFS, TABLES } from "../lib/airtable/schema";
import { SEED_GUESTS, SEED_GIFTS } from "../lib/seed-data";
import Airtable from "airtable";

const API = "https://api.airtable.com/v0";
const TOKEN = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!TOKEN || !BASE_ID) {
  console.error("✗ Faltando AIRTABLE_API_KEY ou AIRTABLE_BASE_ID em .env");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

type MetaTable = { id: string; name: string; fields: { id: string; name: string }[] };

async function listExistingTables(): Promise<MetaTable[]> {
  const res = await fetch(`${API}/meta/bases/${BASE_ID}/tables`, { headers });
  if (!res.ok) throw new Error(`list tables: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as { tables: MetaTable[] };
  return j.tables;
}

async function createTable(def: (typeof TABLE_DEFS)[number]): Promise<MetaTable> {
  const res = await fetch(`${API}/meta/bases/${BASE_ID}/tables`, {
    method: "POST",
    headers,
    body: JSON.stringify(def),
  });
  if (!res.ok) throw new Error(`create table ${def.name}: ${res.status} ${await res.text()}`);
  return (await res.json()) as MetaTable;
}

async function addField(tableId: string, field: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${API}/meta/bases/${BASE_ID}/tables/${tableId}/fields`, {
    method: "POST",
    headers,
    body: JSON.stringify(field),
  });
  if (!res.ok) throw new Error(`add field ${field.name}: ${res.status} ${await res.text()}`);
}

async function main() {
  console.log("→ Inspecionando base Airtable...");
  let existing = await listExistingTables();
  const byName = new Map(existing.map((t) => [t.name, t]));

  // 1. Criar tabelas base
  for (const def of TABLE_DEFS) {
    if (byName.has(def.name)) {
      console.log(`  · ${def.name} já existe — skip`);
      continue;
    }
    console.log(`  + criando ${def.name}...`);
    const created = await createTable(def);
    byName.set(created.name, created);
  }

  // 2. Adicionar linked records & rollup (precisam que as tabelas existam)
  existing = await listExistingTables();
  const guests = existing.find((t) => t.name === TABLES.guests)!;
  const gifts = existing.find((t) => t.name === TABLES.gifts)!;
  const purchases = existing.find((t) => t.name === TABLES.purchases)!;

  const purchaseFieldNames = new Set(purchases.fields.map((f) => f.name));
  if (!purchaseFieldNames.has("Guest")) {
    console.log("  + Purchases.Guest (link → Guests)");
    await addField(purchases.id, {
      name: "Guest",
      type: "multipleRecordLinks",
      options: { linkedTableId: guests.id, prefersSingleRecordLink: true },
    });
  }
  if (!purchaseFieldNames.has("Gift")) {
    console.log("  + Purchases.Gift (link → Gifts)");
    await addField(purchases.id, {
      name: "Gift",
      type: "multipleRecordLinks",
      options: { linkedTableId: gifts.id, prefersSingleRecordLink: true },
    });
  }

  // 3. Rollup ClaimedCount em Gifts
  const giftFieldNames = new Set(gifts.fields.map((f) => f.name));
  if (!giftFieldNames.has("ClaimedCount")) {
    // refetch p/ pegar field id de Purchases.Gift e Purchases.Status
    const fresh = await listExistingTables();
    const purchasesFresh = fresh.find((t) => t.id === purchases.id)!;
    const giftLinkField = purchasesFresh.fields.find((f) => f.name === "Gift");
    const statusField = purchasesFresh.fields.find((f) => f.name === "Status");
    if (!giftLinkField || !statusField) {
      throw new Error("Não encontrei Purchases.Gift ou Purchases.Status p/ criar rollup");
    }
    console.log("  + Gifts.ClaimedCount (rollup approved purchases)");
    await addField(gifts.id, {
      name: "ClaimedCount",
      type: "rollup",
      options: {
        recordLinkFieldId: undefined, // requer field link em Gifts → Purchases (reverso)
        // NOTA: Airtable cria automaticamente o reverse-link em Gifts quando criamos
        // Purchases.Gift. O nome do reverse-link default é "Purchases".
        // Vamos buscar esse field e usar.
      },
    }).catch(async () => {
      // fallback: descobrir reverse link field
      const freshGifts = (await listExistingTables()).find((t) => t.id === gifts.id)!;
      const reverseLink = freshGifts.fields.find((f) => f.name === "Purchases" || f.name.startsWith("Purchases"));
      if (!reverseLink) throw new Error("reverse-link em Gifts ainda não materializado");
      await addField(gifts.id, {
        name: "ClaimedCount",
        type: "rollup",
        options: {
          recordLinkFieldId: reverseLink.id,
          fieldIdInLinkedTable: statusField.id,
          referencedFieldIds: [statusField.id],
          result: { type: "number", options: { precision: 0 } },
          formula: 'COUNTA(FILTER(values, value = "approved"))',
        },
      });
    });
  }

  // 4. Seed Guests
  const at = new Airtable({ apiKey: TOKEN }).base(BASE_ID!);
  const existingGuests = await at(TABLES.guests).select({ fields: ["GuestKey"] }).all();
  const existingKeys = new Set(existingGuests.map((r) => r.get("GuestKey") as string));
  const toInsertGuests = SEED_GUESTS.filter((g) => !existingKeys.has(g.GuestKey));
  if (toInsertGuests.length > 0) {
    console.log(`  + seed ${toInsertGuests.length} convidados`);
    // batches de 10 (limite Airtable)
    for (let i = 0; i < toInsertGuests.length; i += 10) {
      await at(TABLES.guests).create(toInsertGuests.slice(i, i + 10).map((fields) => ({ fields })));
    }
  } else {
    console.log("  · convidados já populados — skip");
  }

  // 5. Seed Gifts
  const existingGifts = await at(TABLES.gifts).select({ fields: ["Name"] }).all();
  const existingGiftNames = new Set(existingGifts.map((r) => r.get("Name") as string));
  const toInsertGifts = SEED_GIFTS.filter((g) => !existingGiftNames.has(g.Name));
  if (toInsertGifts.length > 0) {
    console.log(`  + seed ${toInsertGifts.length} gifts`);
    for (let i = 0; i < toInsertGifts.length; i += 10) {
      await at(TABLES.gifts).create(toInsertGifts.slice(i, i + 10).map((fields) => ({ fields })));
    }
  } else {
    console.log("  · gifts já populados — skip");
  }

  console.log("✓ Bootstrap completo.");
}

main().catch((err) => {
  console.error("✗", err);
  process.exit(1);
});
