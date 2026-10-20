import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { getGifts } from "@/lib/get-gifts";
import {
  FALHA_GENERICA,
  PENDING_CODES,
  REJECTION_CODES,
  paymentRejection,
  pendingNote,
} from "@/lib/mp/status-detail";
import { PIX_COPY } from "@/lib/pix-copy";
import { SOLD_OUT_COPY } from "@/components/GiftCard";
import { ToastPreview } from "./toast-preview";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

/**
 * Catálogo das mensagens que o convidado vê — o casal testa cada uma ao vivo.
 * Textos vêm das próprias fontes (status-detail, PixPanel, GiftCard) ∴ ⊥ divergem.
 */
export default async function AdminMensagensPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const s = await getAdminSession();
  if (!s) redirect("/admin/login");

  const gifts = await getGifts();
  const { id } = await searchParams;
  const selected = gifts.find((gift) => gift.id === id) ?? gifts[0];

  const obrigado = (status: string, detail?: string, giftId = selected?.id ?? "") =>
    `/obrigado?id=${encodeURIComponent(giftId)}&s=${status}${detail ? `&d=${detail}` : ""}`;

  const thanks = [
    { label: "Pendente", text: "Sem motivo específico do Mercado Pago", href: obrigado("pending") },
    ...PENDING_CODES.map((code) => ({
      label: "Pendente",
      code,
      text: pendingNote(code) ?? "",
      href: obrigado("pending", code),
    })),
  ];

  const rejections = [
    { code: "erro genérico", ...FALHA_GENERICA },
    ...REJECTION_CODES.map((code) => ({ code, ...paymentRejection(code) })),
  ];

  const pix = [
    { label: "QR gerado", text: `${PIX_COPY.ready} · ${PIX_COPY.hint}` },
    { label: "Aguardando", text: PIX_COPY.waiting },
    { label: "Contagem", text: `${PIX_COPY.timer} 29 : 59` },
    { label: "Recusado", text: `${PIX_COPY.rejected} [${PIX_COPY.retry}]` },
    { label: "Expirado", text: `${PIX_COPY.expired} [${PIX_COPY.retry}]` },
  ];

  return (
    <div>
      <header className={styles.pageHeader}>
        <div>
          <p className={`ds-eyebrow ${styles.pageEyebrow}`}>O que o convidado lê</p>
          <h1 className={`ds-h1 ${styles.pageTitle}`}>Mensagens</h1>
        </div>
      </header>

      <section className={styles.bucket}>
        <header className={styles.bucketHeader}>Agradecimento por presente (pagamento aprovado)</header>
        <p className={styles.msgHint}>
          Cada mensagem entra no meio da nota, entre a abertura e o fechamento. Para mudar,
          edite o presente em <a href="/admin/presentes">Presentes</a> ou o campo ThankYou no
          Airtable. Sem mensagem própria, o presente usa a geral (com P.S. da lua de mel).
        </p>
        <table className={styles.table}>
          <tbody>
            {gifts.map((gift) => (
              <tr key={gift.id}>
                <td className={styles.msgKind}>{gift.name}</td>
                <td className={styles.msgText}>
                  {gift.thankYou ?? <em className={styles.msgFallback}>Usa a mensagem geral</em>}
                </td>
                <td className={styles.msgAction}>
                  <a
                    href={obrigado("approved", undefined, gift.id)}
                    target="_blank"
                    rel="noopener"
                    className={styles.btn}
                  >
                    Abrir
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.bucket}>
        <header className={styles.bucketHeader}>Pagamento pendente</header>
        <form method="get" className={styles.msgForm}>
          <label htmlFor="msg-gift" className={styles.msgLabel}>
            Presente usado na prévia
          </label>
          <select id="msg-gift" name="id" defaultValue={selected?.id} className={styles.msgSelect}>
            {gifts.map((gift) => (
              <option key={gift.id} value={gift.id}>
                {gift.name}
              </option>
            ))}
          </select>
          <button type="submit" className={styles.btn}>
            Aplicar
          </button>
        </form>
        <table className={styles.table}>
          <tbody>
            {thanks.map((t) => (
              <tr key={t.href}>
                <td className={styles.msgKind}>
                  {t.label}
                  {"code" in t && <code className={styles.msgCode}>{t.code}</code>}
                </td>
                <td className={styles.msgText}>{t.text}</td>
                <td className={styles.msgAction}>
                  <a href={t.href} target="_blank" rel="noopener" className={styles.btn}>
                    Abrir
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.bucket}>
        <header className={styles.bucketHeader}>Cartão recusado (aviso flutuante)</header>
        <ToastPreview rows={rejections} />
      </section>

      <section className={styles.bucket}>
        <header className={styles.bucketHeader}>Pix</header>
        <table className={styles.table}>
          <tbody>
            {pix.map((p) => (
              <tr key={p.label}>
                <td className={styles.msgKind}>{p.label}</td>
                <td className={styles.msgText}>{p.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.bucket}>
        <header className={styles.bucketHeader}>Lista</header>
        <table className={styles.table}>
          <tbody>
            <tr>
              <td className={styles.msgKind}>Presente esgotado</td>
              <td className={styles.msgText}>{SOLD_OUT_COPY}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
