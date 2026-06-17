import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { LoginForm } from "./login-form";
import styles from "./login.module.css";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const s = await getAdminSession();
  if (s) redirect("/admin/presentes");

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className="ds-eyebrow">Painel do casal</p>
        <h1 className={`ds-h2 ${styles.title}`}>Entrar</h1>
        <LoginForm />
      </div>
    </main>
  );
}
