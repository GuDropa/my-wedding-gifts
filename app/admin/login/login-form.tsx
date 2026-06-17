"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export function LoginForm() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, pass }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Não conseguimos entrar.");
      }
      router.push("/admin/presentes");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <label className={styles.field}>
        <span className="ds-label">Usuário</span>
        <input
          type="text"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          autoComplete="username"
          className={styles.input}
          required
        />
      </label>
      <label className={styles.field}>
        <span className="ds-label">Senha</span>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete="current-password"
          className={styles.input}
          required
        />
      </label>
      {err && <p className={styles.error}>{err}</p>}
      <button type="submit" disabled={pending} className={styles.submit}>
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
