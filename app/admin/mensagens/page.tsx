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
  searchParams: Promise<{ g?: string }>;
}) {
  const s = await getAdminSession();
  if (!s) redirect("/admin/login");

  const gifts = await getGifts();
  const { g } = await searchParams;
  const giftName = g ?? gifts[0]?.name ?? "esse presente";

  const obrigado = (status: string, detail?: string) =>
    `/obrigado?g=${encodeURIComponent(giftName)}&s=${status}${detail ? `&d=${detail}` : ""}`;

  const thanks = [
    { label: "Pagamento aprovado", text: "Nota de agradecimento com P.S.", href: obrigado("approved") },
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
        <header className={styles.bucketHeader}>Depois da compra</header>
        <form method="get" className={styles.msgForm}>
          <label htmlFor="msg-gift" className={styles.msgLabel}>
            Presente usado na prévia
          </label>
          <select id="msg-gift" name="g" defaultValue={giftName} className={styles.msgSelect}>
            {gifts.map((gift) => (
              <option key={gift.id} value={gift.name}>
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
