"use client";

import { useCallback, useRef, useState } from "react";
import { Toast, type ToastData } from "@/components/Toast";
import styles from "../admin.module.css";

interface Row {
  code: string;
  title: string;
  message: string;
}

/** Dispara o mesmo `Toast` que o convidado vê em `/presentear/:id` (V43). */
export function ToastPreview({ rows }: { rows: Row[] }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const seq = useRef(0);
  const close = useCallback(() => setToast(null), []);

  return (
    <>
      <Toast toast={toast} onClose={close} />
      <table className={styles.table}>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code}>
              <td className={styles.msgKind}>
                {r.title}
                <code className={styles.msgCode}>{r.code}</code>
              </td>
              <td className={styles.msgText}>{r.message}</td>
              <td className={styles.msgAction}>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => {
                    seq.current += 1;
                    setToast({ id: seq.current, tone: "error", title: r.title, message: r.message });
                  }}
                >
                  Mostrar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
