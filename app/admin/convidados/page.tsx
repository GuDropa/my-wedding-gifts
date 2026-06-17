import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { getGuestsWithState } from "@/lib/admin-data";
import { fmtBRL } from "@/lib/fmt";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminConvidadosPage() {
  const s = await getAdminSession();
  if (!s) redirect("/admin/login");

  const rows = await getGuestsWithState();

  return (
    <div>
      <header className={styles.pageHeader}>
        <div>
          <p className={`ds-eyebrow ${styles.pageEyebrow}`}>Lista fechada</p>
          <h1 className={`ds-h1 ${styles.pageTitle}`}>Convidados</h1>
        </div>
        <p className="ds-body-sm" style={{ color: "var(--ink-soft)" }}>
          {rows.length} no total
        </p>
      </header>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Visualizou</th>
            <th>Presenteou</th>
            <th>Presente</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => (
            <tr key={g.id}>
              <td style={{ fontFamily: "var(--font-display-stack)", fontSize: 17, color: "var(--olive)" }}>
                {g.name}
              </td>
              <td>
                <span className={`${styles.badge} ${g.viewed ? styles.badgeOk : styles.badgeOff}`}>
                  {g.viewed ? "sim" : "não"}
                </span>
              </td>
              <td>
                <span className={`${styles.badge} ${g.purchased ? styles.badgeOk : styles.badgeOff}`}>
                  {g.purchased ? "sim" : "ainda não"}
                </span>
              </td>
              <td style={{ color: "var(--ink-soft)" }}>
                {g.gifts.length > 0 ? g.gifts.join(", ") : "—"}
              </td>
              <td style={{ fontVariantNumeric: "tabular-nums" }}>
                {g.totalCents > 0 ? fmtBRL(g.totalCents) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
