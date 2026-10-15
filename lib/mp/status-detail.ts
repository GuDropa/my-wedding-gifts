/**
 * V31: traduz `status_detail` do Mercado Pago p/ um aviso acionável em pt-BR.
 * B7: sem isso toda recusa virava "Pagamento não aprovado" — o convidado não
 * sabia o que corrigir e o casal não tinha como depurar.
 * V42: cobre toda a tabela de status_detail da doc MP ("Consulta sobre o status
 * de um pagamento"); recusas viram toast, pendências viram nota em `/obrigado`.
 * V5: voz "nós", quente. V8: ♥ parco — só no fallback.
 * ⊥ importar `server-only`: usado também no client.
 */

export interface PaymentFeedback {
  title: string;
  message: string;
}

const TITLE_REJECTED = "Pagamento não aprovado";
const TITLE_CHECK_DATA = "Confira os dados do cartão";

// Recusas (status `rejected`) — o convidado continua na tela e pode tentar de novo.
const MOTIVOS: Record<string, string> = {
  // dados preenchidos errado
  cc_rejected_bad_filled_card_number: "Confira o número do cartão.",
  cc_rejected_bad_filled_date: "Confira a data de validade do cartão.",
  cc_rejected_bad_filled_security_code: "Confira o código de segurança (CVV).",
  cc_rejected_bad_filled_other: "Confira os dados do cartão e tente de novo.",
  rejected_insufficient_data: "Faltaram alguns dados do pagamento. Confira o formulário e tente de novo.",
  // cartão / banco
  cc_rejected_insufficient_amount: "O cartão não tem saldo suficiente para esse valor.",
  insufficient_amount: "O saldo não é suficiente para esse valor. Tente outro cartão ou o Pix.",
  cc_rejected_card_disabled: "Esse cartão está inativo. Fale com o banco ou use outro.",
  cc_rejected_call_for_authorize: "Seu banco pediu autorização para esse valor. Autorize e tente de novo.",
  cc_rejected_card_type_not_allowed: "Esse cartão não aceita crédito. Tente outro cartão ou o Pix.",
  cc_rejected_invalid_installments: "Esse cartão não aceita esse número de parcelas.",
  cc_rejected_duplicated_payment: "Esse pagamento já foi feito — não precisa repetir.",
  cc_rejected_max_attempts: "Muitas tentativas seguidas. Tente outro cartão ou o Pix.",
  cc_amount_rate_limit_exceeded: "O cartão atingiu o limite para esse tipo de pagamento. Tente outro cartão ou o Pix.",
  cc_rejected_time_out: "O banco demorou para responder. Tente de novo em instantes.",
  bank_error: "O banco do cartão teve um problema agora. Tente de novo em instantes ou pague com Pix.",
  rejected_by_bank: "O banco recusou a operação. Fale com o banco ou pague com Pix.",
  // verificação de segurança (3DS)
  cc_rejected_3ds_challenge: "A verificação de segurança do cartão não foi concluída. Tente de novo ou pague com Pix.",
  cc_rejected_3ds_mandatory: "Esse cartão pede uma verificação de segurança que não foi feita. Tente outro cartão ou o Pix.",
  // análise de risco / regras
  cc_rejected_high_risk: "O banco não autorizou. Tente outro cartão ou o Pix.",
  rejected_high_risk: "O pagamento não passou na análise de segurança. Tente outro cartão ou o Pix.",
  cc_rejected_blacklist: "O banco não autorizou. Tente outro cartão ou o Pix.",
  rejected_by_regulations: "Esse pagamento não pôde ser aceito pelas regras do meio de pagamento. Tente outro cartão ou o Pix.",
  rejected_by_biz_rule: "Esse pagamento não pôde ser aceito. Tente outro cartão ou o Pix.",
  // genéricos
  cc_rejected_card_error: "Não conseguimos processar esse cartão. Tente outro ou o Pix.",
  cc_rejected_other_reason: "O banco não autorizou. Tente outro cartão ou o Pix.",
  rejected_other_reason: "Não conseguimos concluir esse pagamento. Tente outro cartão ou o Pix.",
};

const CHECK_DATA = new Set([
  "cc_rejected_bad_filled_card_number",
  "cc_rejected_bad_filled_date",
  "cc_rejected_bad_filled_security_code",
  "cc_rejected_bad_filled_other",
  "rejected_insufficient_data",
]);

// Pendências (status `pending` | `in_process` | `authorized`) — o presente segue
// p/ `/obrigado` em "Quase lá"; isto explica o que falta acontecer.
const PENDENTES: Record<string, string> = {
  pending_contingency: "Seu pagamento está em análise. Em até 2 dias úteis a confirmação chega no seu e-mail.",
  pending_review_manual: "Seu pagamento está em revisão. O Mercado Pago pode pedir alguma informação por e-mail.",
  offline_process: "Seu pagamento está sendo processado e logo deve ser confirmado.",
  deferred_retry: "Seu pagamento está sendo processado e logo deve ser confirmado.",
  pending_capture: "Seu pagamento está sendo processado e logo deve ser confirmado.",
  pending_challenge: "Falta concluir a verificação de segurança pedida pelo banco do cartão.",
};

const FALLBACK = "Não conseguimos concluir esse pagamento. Tente outro cartão ou o Pix ♥";

export function paymentErrorCopy(statusDetail?: string | null): string {
  if (!statusDetail) return FALLBACK;
  return MOTIVOS[statusDetail] ?? FALLBACK;
}

/** Aviso de recusa p/ o toast — título curto + motivo acionável. */
export function paymentRejection(statusDetail?: string | null): PaymentFeedback {
  return {
    title: statusDetail && CHECK_DATA.has(statusDetail) ? TITLE_CHECK_DATA : TITLE_REJECTED,
    message: paymentErrorCopy(statusDetail),
  };
}

/** Nota extra p/ `/obrigado` pendente; null quando ⊥ há o que explicar. */
export function pendingNote(statusDetail?: string | null): string | null {
  if (!statusDetail) return null;
  return PENDENTES[statusDetail] ?? null;
}
