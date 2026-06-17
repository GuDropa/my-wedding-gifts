/** Helpers de formatação (neutros, podem ser usados em client & server). */

/** V6/V12: centavos → "R$ X,YY" com vírgula decimal. */
export function fmtBRL(cents: number): string {
  return "R$ " + (cents / 100).toFixed(2).replace(".", ",");
}
