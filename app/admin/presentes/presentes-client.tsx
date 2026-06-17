"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";
import styles from "../admin.module.css";

interface AdminGift {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  limit: number;
  claimed: number;
  tint: string;
}

interface Props {
  initialGifts: AdminGift[];
  canEdit: boolean;
  fmtPrice: (cents: number) => string;
}

export function PresentesAdmin({ initialGifts, canEdit, fmtPrice }: Props) {
  const [gifts, setGifts] = useState(initialGifts);
  const [editing, setEditing] = useState<AdminGift | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const router = useRouter();

  async function handleSave(g: Partial<AdminGift> & { id?: string }) {
    if (!canEdit) {
      alert("Configure Airtable p/ editar (seed é read-only)");
      return;
    }
    setPending(g.id ?? "new");
    const isNew = !g.id;
    const res = await fetch(
      isNew ? "/api/admin/gifts" : `/api/admin/gifts/${encodeURIComponent(g.id!)}`,
      {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(g),
      },
    );
    setPending(null);
    if (!res.ok) {
      alert("Falha ao salvar");
      return;
    }
    setEditing(null);
    setShowNew(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esse presente da lista?")) return;
    if (!canEdit) {
      alert("Configure Airtable p/ editar");
      return;
    }
    setPending(id);
    const res = await fetch(`/api/admin/gifts/${encodeURIComponent(id)}`, { method: "DELETE" });
    setPending(null);
    if (!res.ok) {
      alert("Falha ao remover");
      return;
    }
    setGifts((g) => g.filter((x) => x.id !== id));
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--sp-4)" }}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => setShowNew(true)}
          disabled={!canEdit}
        >
          <Plus size={14} strokeWidth={1.5} /> Novo presente
        </button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Descrição</th>
            <th>Preço</th>
            <th>Cota</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {gifts.map((g) => {
            const soldOut = g.claimed >= g.limit;
            return (
              <tr key={g.id}>
                <td style={{ fontFamily: "var(--font-display-stack)", fontSize: 17, color: "var(--olive)" }}>
                  {g.name}
                </td>
                <td style={{ color: "var(--ink-soft)", maxWidth: 320 }}>{g.description}</td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>{fmtPrice(g.priceCents)}</td>
                <td>
                  <span className={`${styles.badge} ${soldOut ? styles.badgeOff : styles.badgeOk}`}>
                    {g.claimed} / {g.limit}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.btn}
                      onClick={() => setEditing(g)}
                      disabled={!canEdit || pending === g.id}
                    >
                      <Pencil size={14} strokeWidth={1.5} /> Editar
                    </button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnDanger}`}
                      onClick={() => handleDelete(g.id)}
                      disabled={!canEdit || pending === g.id}
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {(editing || showNew) && (
        <GiftEditor
          gift={editing}
          onCancel={() => {
            setEditing(null);
            setShowNew(false);
          }}
          onSave={handleSave}
          pending={pending}
        />
      )}

      {!canEdit && (
        <p style={{ marginTop: "var(--sp-5)", color: "var(--ink-faint)", fontStyle: "italic", fontSize: 13 }}>
          Modo somente leitura — dados do seed local. Configure Airtable p/ habilitar CRUD.
        </p>
      )}
    </div>
  );
}

function GiftEditor({
  gift,
  onCancel,
  onSave,
  pending,
}: {
  gift: AdminGift | null;
  onCancel: () => void;
  onSave: (g: Partial<AdminGift> & { id?: string }) => void;
  pending: string | null;
}) {
  const [form, setForm] = useState({
    id: gift?.id,
    name: gift?.name ?? "",
    description: gift?.description ?? "",
    priceCents: gift?.priceCents ?? 0,
    limit: gift?.limit ?? 1,
    tint: gift?.tint ?? "#E4E8DD",
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--overlay)",
        display: "grid",
        placeItems: "center",
        padding: "var(--sp-4)",
        zIndex: 50,
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
        style={{
          background: "var(--white)",
          padding: "var(--sp-6)",
          borderRadius: "var(--r-lg)",
          width: "100%",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          gap: "var(--sp-4)",
        }}
      >
        <h2 className="ds-h3">{gift ? "Editar presente" : "Novo presente"}</h2>
        <label style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
          <span className="ds-label">Nome</span>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
          <span className="ds-label">Descrição</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
            <span className="ds-label">Preço (centavos)</span>
            <input
              type="number"
              value={form.priceCents}
              onChange={(e) => setForm({ ...form, priceCents: Number(e.target.value) })}
              required
              min={0}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
            <span className="ds-label">Cota</span>
            <input
              type="number"
              value={form.limit}
              onChange={(e) => setForm({ ...form, limit: Number(e.target.value) })}
              required
              min={1}
              style={inputStyle}
            />
          </label>
        </div>
        <div style={{ display: "flex", gap: "var(--sp-2)", justifyContent: "flex-end", marginTop: "var(--sp-3)" }}>
          <button type="button" className={styles.btn} onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={pending !== null}
          >
            {pending !== null ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "var(--sp-3) var(--sp-4)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md)",
  fontFamily: "var(--font-sans-stack)",
  fontSize: 14,
  color: "var(--ink)",
  background: "var(--paper)",
};
