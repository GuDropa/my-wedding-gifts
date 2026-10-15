/**
 * V38: status do Mercado Pago → `Purchases.Status`. Ponto único, usado pelo
 * webhook e por `/api/process-payment`.
 * B12: antes, tudo que não fosse approved|rejected virava `pending` — estorno e
 * chargeback de compra aprovada voltavam a "aguardando", e pix expirado
 * (`cancelled`) ficava pendente p/ sempre.
 * B14: cartão em análise volta `in_process` (⊥ `pending`); sem mapear, o client
 * tratava como recusa e o convidado podia pagar de novo.
 */
import type { PurchaseStatus } from "@/lib/airtable/schema";

// Pagamento morto: recusado, expirado/cancelado ou devolvido ao pagador.
const REJECTED = new Set(["rejected", "cancelled", "refunded", "charged_back"]);

export function mapPaymentStatus(status: string | null | undefined): PurchaseStatus {
  if (status === "approved") return "approved";
  if (status && REJECTED.has(status)) return "rejected";
  // pending | in_process | authorized | in_mediation — ainda pode virar qualquer coisa
  return "pending";
}
