/**
 * V31: traduz `status_detail` do Mercado Pago p/ um motivo acionável em pt-BR.
 * B7: sem isso toda recusa virava "Pagamento não aprovado" — o convidado não
 * sabia o que corrigir e o casal não tinha como depurar.
 * V5: voz "nós", quente. V8: ♥ parco — só no fallback.
 * ⊥ importar `server-only`: usado também no client.
 */
const MOTIVOS: Record<string, string> = {
  cc_rejected_bad_filled_card_number: "Confira o número do cartão.",
  cc_rejected_bad_filled_date: "Confira a data de validade do cartão.",
  cc_rejected_bad_filled_security_code: "Confira o código de segurança (CVV).",
  cc_rejected_bad_filled_other: "Confira os dados do cartão e tente de novo.",
  cc_rejected_insufficient_amount: "O cartão não tem saldo suficiente para esse valor.",
  cc_rejected_card_disabled: "Esse cartão está inativo. Fale com o banco ou use outro.",
  cc_rejected_call_for_authorize: "Seu banco pediu autorização para esse valor. Autorize e tente de novo.",
  cc_rejected_duplicated_payment: "Esse pagamento já foi feito — não precisa repetir.",
  cc_rejected_high_risk: "O banco não autorizou. Tente outro cartão ou o Pix.",
  cc_rejected_card_error: "Não conseguimos processar esse cartão. Tente outro ou o Pix.",
  cc_rejected_invalid_installments: "Esse cartão não aceita esse número de parcelas.",
  cc_rejected_max_attempts: "Muitas tentativas seguidas. Tente outro cartão ou o Pix.",
  cc_rejected_other_reason: "O banco não autorizou. Tente outro cartão ou o Pix.",
  cc_rejected_blacklist: "O banco não autorizou. Tente outro cartão ou o Pix.",
};

const FALLBACK = "Não conseguimos concluir esse pagamento. Tente outro cartão ou o Pix ♥";

export function paymentErrorCopy(statusDetail?: string | null): string {
  if (!statusDetail) return FALLBACK;
  return MOTIVOS[statusDetail] ?? FALLBACK;
}
