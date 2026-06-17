import Link from "next/link";
import { headers } from "next/headers";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const path = h.get("x-pathname") ?? "";

  // Login não usa layout completo
  if (path.includes("/admin/login")) return <>{children}</>;

  const NAV = [
    { href: "/admin/presentes", label: "Presentes" },
    { href: "/admin/convidados", label: "Convidados" },
    { href: "/admin/metricas", label: "Métricas" },
  ];

  return (
    <div className={styles.shell}>
      <aside className={styles.aside}>
        <div className={styles.brand}>
          <span className={styles.brandLetter}>G</span>
          <span className={styles.brandHeart}>♥</span>
          <span className={styles.brandLetter}>G</span>
        </div>
        <p className={`ds-eyebrow ${styles.brandSub}`}>Painel do casal</p>
        <nav className={styles.nav}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={styles.navLink}>
              {n.label}
            </Link>
          ))}
        </nav>
        <form action="/api/admin/logout" method="post" className={styles.logoutForm}>
          <button type="submit" className={styles.logout}>Sair</button>
        </form>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
