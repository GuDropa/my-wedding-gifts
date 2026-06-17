/**
 * Frame inset 1px (V19) — a assinatura do convite.
 * Wrappa um hero card com hairline `--line-strong` a ~24px da borda externa.
 */
import type { ReactNode } from "react";
import styles from "./Frame.module.css";

export function Frame({
  children,
  inset = 24,
}: {
  children: ReactNode;
  inset?: number;
}) {
  return (
    <div className={styles.outer}>
      <div
        className={styles.frame}
        style={{ ["--frame-inset" as string]: `${inset}px` }}
      >
        {children}
      </div>
    </div>
  );
}
