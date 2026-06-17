import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { getGuestsWithState } from "@/lib/admin-data";
import { getGifts } from "@/lib/get-gifts";
import { fmtBRL } from "@/lib/fmt";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminMetricasPage() {
  const s = await getAdminSession();
  if (!s) redirect("/admin/login");

  const [guests, gifts] = await Promise.all([getGuestsWithState(), getGifts()]);

  const presentearam = guests.filter((g) => g.purchased);
  const viramNaoDeram = guests.filter((g) => g.viewed && !g.purchased);
  const naoViram = guests.filter((g) => !g.viewed && !g.purchased);

  const totalArrecadado = guests.reduce((acc, g) => acc + g.totalCents, 0);
  const presentesDados = gifts.reduce((acc, g) => acc + g.claimed, 0);
  const totalCotasAbertas = gifts.reduce((acc, g) => acc + (g.limit - g.claimed), 0);

  return (
    <div>
      <header className={styles.pageHeader}>
        <div>
          <p className={`ds-eyebrow ${styles.pageEyebrow}`}>Nosso caminhar</p>
          <h1 className={`ds-h1 ${styles.pageTitle}`}>Métricas</h1>
        </div>
      </header>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Arrecadado</div>
          <div className={styles.statValue}>{fmtBRL(totalArrecadado)}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Presentes dados</div>
          <div className={styles.statValue}>{presentesDados}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Cotas restantes</div>
          <div className={styles.statValue}>{totalCotasAbertas}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Convidados ativos</div>
          <div className={styles.statValue}>
            {presentearam.length} / {guests.length}
          </div>
        </div>
      </div>

      <Bucket title={`Presentearam (${presentearam.length})`} rows={presentearam.map((g) => g.name)} />
      <Bucket
        title={`Viram, ainda não deram (${viramNaoDeram.length})`}
        rows={viramNaoDeram.map((g) => g.name)}
      />
      <Bucket title={`Ainda não viram (${naoViram.length})`} rows={naoViram.map((g) => g.name)} />
    </div>
  );
}

function Bucket({ title, rows }: { title: string; rows: string[] }) {
  return (
    <section className={styles.bucket}>
      <header className={styles.bucketHeader}>{title}</header>
      {rows.length === 0 ? (
        <p className={styles.empty}>Vazio por enquanto</p>
      ) : (
        <ul className={styles.bucketList}>
          {rows.map((n) => (
            <li key={n} className={styles.bucketItem}>
              {n}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
