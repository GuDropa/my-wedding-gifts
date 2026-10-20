/** Helpers de formatação (neutros, podem ser usados em client & server). */

/** V6/V12: centavos → "R$ X.XXX,YY" — ponto de milhar, vírgula decimal. */
export function fmtBRL(cents: number): string {
  const [int, dec] = (cents / 100).toFixed(2).split(".");
  return "R$ " + int.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + dec;
}
