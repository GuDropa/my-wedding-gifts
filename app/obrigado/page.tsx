import { redirect } from "next/navigation";
import { getGuestSession } from "@/lib/session";
import { getAdminSession } from "@/lib/admin-session";
import { FloralCorners } from "@/components/FloralCorners";
import { Frame } from "@/components/Frame";
import { pendingNote } from "@/lib/mp/status-detail";
import { getGift } from "@/lib/get-gifts";
import { Petals } from "./petals";
import styles from "./obrigado.module.css";

export const dynamic = "force-dynamic";

export default async function ObrigadoPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; id?: string; g?: string; s?: string; d?: string }>;
}) {
  const session = await getGuestSession();
  // Prévia do casal (`/admin/mensagens`): sem convidado, saúda um nome genérico.
  const preview = session ? null : await getAdminSession();
  if (!session && !preview) redirect("/");

  const { id, g, s, d } = await searchParams;
  // `id` traz o agradecimento do presente; `g` (nome) segue como fallback de links antigos.
  const gift = id ? await getGift(id) : null;
  const giftName = gift?.name ?? g ?? "esse presente";
  const thankYou = gift?.thankYou ?? null;
  const status = s ?? "approved";
  // V42: cartão em análise (ex.: CONT → pending_contingency) explica o que falta.
  const note = status === "pending" ? pendingNote(d) : null;
  const first = session ? session.name.split(" ")[0] : "Convidado";

  return (
    <main className={styles.page}>
      <FloralCorners variant="all" opacity={0.85} size={260} />
      <Petals />
      <div className={styles.shell}>
        <Frame inset={20}>
          <article className={styles.note}>
            <p className={`ds-eyebrow ${styles.eyebrow}`}>
              {status === "pending" ? "Quase lá" : "Obrigado"}
              <span className={styles.heart}> ♥</span>
            </p>

            <h1 className={`ds-display ${styles.dear}`}>
              {first},
            </h1>

            <p className={`${styles.body} ${styles.writeIn}`}>
              {status === "pending" ? (
                <>
                  Recebemos seu presente <em>{giftName}</em>! Agora só falta a
                  confirmação.{note && <> {note}</>} Assim que aprovar,
                  ele entra oficialmente na nossa história, seja na mala rumo a
                  Buenos Aires ou na nossa casa nova. Obrigado, de verdade, por
                  estar com a gente.
                </>
              ) : (
                <>
                  Que alegria! Você acabou de nos presentear com <em>{giftName}</em>,
                  e a gente já está sorrindo à toa.{" "}
                  {thankYou ??
                    "Seja na mala rumo a Buenos Aires ou na nossa casa nova, esse carinho vai junto com a gente."}{" "}
                  Obrigado por fazer parte da nossa história. Te esperamos no
                  dia <strong>21 / 11 / 2026</strong> pra celebrar juntos.
                </>
              )}
            </p>

            {/* P.S. geral só quando o presente ⊥ tem agradecimento próprio */}
            {status !== "pending" && !thankYou && (
              <p className={`ds-body-sm ${styles.ps}`}>
                P.S.: prometemos mandar notícias (e muitas fotos) da lua de mel.
              </p>
            )}

            <div className={styles.divider} aria-hidden />

            <p className={`ds-display ${styles.signature}`}>
              Gabriely <span className="ds-amp">e</span> Gustavo
            </p>
          </article>
        </Frame>
      </div>
    </main>
  );
}
