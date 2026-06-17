/**
 * Header simples: nome do convidado + monograma do casal.
 * V5: voz "nós" — saudação calorosa.
 */
import { Heart } from "lucide-react";
import styles from "./HeaderBar.module.css";

export function HeaderBar({ guestName }: { guestName: string }) {
  const first = guestName.split(" ")[0];
  return (
    <header className={styles.bar}>
      <div className={styles.monogram}>
        <span className={styles.letter}>G</span>
        <Heart size={12} strokeWidth={1.5} className={styles.heart} aria-hidden />
        <span className={styles.letter}>G</span>
      </div>
      <p className={`ds-eyebrow ${styles.greeting}`}>
        Que bom te ver por aqui, <span className={styles.greetingName}>{first}</span> ♥
      </p>
    </header>
  );
}
