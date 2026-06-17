"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Heart } from "lucide-react";
import type { PublicGuest } from "@/lib/get-guests";
import styles from "./identify.module.css";

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function IdentifyClient({ guests }: { guests: PublicGuest[] }) {
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = useMemo(() => {
    if (!query.trim()) return guests;
    const q = normalize(query);
    return guests.filter((g) => normalize(g.name).includes(q)).sort((a, b) => a.initial.localeCompare(b.initial));
  }, [guests, query]);

  function handleSelect(g: PublicGuest) {
    setSelectedKey(g.guestKey);
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestKey: g.guestKey }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Não conseguimos te identificar. Tente de novo ♥");
        setSelectedKey(null);
        return;
      }
      router.push("/presentes");
    });
  }

  return (
    <div className={styles.identify}>
      <div className={styles.searchWrap}>
        <Search size={18} strokeWidth={1.5} className={styles.searchIcon} />
        <input
          type="text"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Buscar seu nome..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.search}
          aria-label="Buscar nome"
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <ul className={styles.guestList} role="listbox">
        {filtered.length === 0 && (
          <li className={`ds-body-sm ${styles.empty}`}>
            Não encontramos esse nome. Tente buscar de outro jeito.
          </li>
        )}
        {filtered.map((g) => {
          const isSelected = selectedKey === g.guestKey;
          return (
            <li key={g.guestKey} role="option" aria-selected={isSelected}>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleSelect(g)}
                className={`${styles.guestItem} ${isSelected ? styles.guestItemActive : ""}`}
              >
                <span className={styles.avatar} aria-hidden>
                  {g.initial}
                </span>
                <span className={styles.guestName}>{g.name}</span>
                {isSelected && pending && (
                  <Heart
                    size={16}
                    strokeWidth={1.5}
                    className={styles.heartSpin}
                    aria-hidden
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
