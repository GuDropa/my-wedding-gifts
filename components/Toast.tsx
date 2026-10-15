"use client";

/**
 * Toast — aviso flutuante (V43). Fixo no topo da viewport: quem acabou de tocar
 * em "Pagar" está lá embaixo no formulário, e um aviso inline acima do Brick
 * ficava fora da tela — a recusa parecia "não fazer nada".
 * Portal em `document.body` p/ `position: fixed` ⊥ herdar transform de ancestral.
 * V9: só tokens. V17: entrada lenta, ⊥ bounce. V20: Lucide stroke 1.5.
 */
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, Info, X } from "lucide-react";
import styles from "./Toast.module.css";

export interface ToastData {
  /** muda a cada aviso — reinicia o timer mesmo c/ texto igual */
  id: number;
  tone: "error" | "info";
  title: string;
  message: string;
}

interface Props {
  toast: ToastData | null;
  onClose: () => void;
  /** ms até sumir sozinho */
  duration?: number;
}

export function Toast({ toast, onClose, duration = 10_000 }: Props) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onClose, duration);
    return () => clearTimeout(id);
  }, [toast, onClose, duration]);

  // Toast só nasce de ação do convidado ∴ nunca no SSR — `document` existe aqui.
  if (!toast) return null;

  const Icon = toast.tone === "error" ? CircleAlert : Info;

  return createPortal(
    <div
      key={toast.id}
      className={`${styles.toast} ${toast.tone === "error" ? styles.error : styles.info}`}
      role={toast.tone === "error" ? "alert" : "status"}
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
    >
      <Icon size={18} strokeWidth={1.5} className={styles.icon} aria-hidden />
      <div className={styles.text}>
        <p className={styles.title}>{toast.title}</p>
        <p className={styles.message}>{toast.message}</p>
      </div>
      <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar aviso">
        <X size={16} strokeWidth={1.5} aria-hidden />
      </button>
    </div>,
    document.body,
  );
}
