"use client";

/**
 * PixPanel — QR + copia-e-cola do Pix (V28).
 * O convidado paga no app do banco; o webhook do MP (V12) grava `approved`
 * no Airtable e o poll abaixo percebe, levando ele p/ `/obrigado` sozinho.
 * V17: transições lentas. V20: Lucide stroke 1.5. V8: ⊥ emoji exceto ♥.
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, Copy, Clock, Heart } from "lucide-react";
import styles from "./PixPanel.module.css";

export interface PixData {
  qrBase64: string | null;
  qrCode: string | null;
  ticketUrl: string | null;
  expiresAt: string | null;
}

interface Props {
  pix: PixData;
  externalReference: string;
  giftName: string;
}

const POLL_MS = 4000;

export function PixPanel({ pix, externalReference, giftName }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(false);
  const [remaining, setRemaining] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);

  // ---------- contagem até expirar ----------
  useEffect(() => {
    if (!pix.expiresAt) return;
    const target = new Date(pix.expiresAt).getTime();
    if (Number.isNaN(target)) return;

    const tick = () => {
      const ms = target - Date.now();
      if (ms <= 0) {
        setExpired(true);
        setRemaining(null);
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setRemaining(`${m} : ${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pix.expiresAt]);

  // ---------- poll do estado gravado pelo webhook ----------
  useEffect(() => {
    if (expired || rejected) return;
    let alive = true;

    const id = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/payment/status?ref=${encodeURIComponent(externalReference)}`,
        );
        if (!res.ok || !alive) return;
        const j = (await res.json()) as { status?: string };
        if (!alive) return;
        if (j.status === "approved") {
          clearInterval(id);
          router.push(`/obrigado?g=${encodeURIComponent(giftName)}&s=approved`);
        } else if (j.status === "rejected") {
          clearInterval(id);
          setRejected(true);
        }
      } catch {
        // rede instável — segue tentando no próximo tick
      }
    }, POLL_MS);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [externalReference, giftName, router, expired, rejected]);

  const copy = useCallback(async () => {
    if (!pix.qrCode) return;
    try {
      await navigator.clipboard.writeText(pix.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // clipboard bloqueado — o código segue visível p/ seleção manual
    }
  }, [pix.qrCode]);

  if (rejected) {
    return (
      <div className={styles.panel}>
        <p className={`ds-body ${styles.failed}`}>
          O pagamento não foi concluído. Você pode tentar de novo, sem pressa.
        </p>
        <button type="button" className={styles.cta} onClick={() => location.reload()}>
          Gerar outro Pix
        </button>
      </div>
    );
  }

  if (expired) {
    return (
      <div className={styles.panel}>
        <p className={`ds-body ${styles.failed}`}>
          Esse código Pix expirou. Geramos um novo em um instante.
        </p>
        <button type="button" className={styles.cta} onClick={() => location.reload()}>
          Gerar outro Pix
        </button>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <p className={`ds-eyebrow ${styles.eyebrow}`}>Seu Pix está pronto</p>

      {pix.qrBase64 && (
        <div className={styles.qrWrap}>
          <Image
            src={`data:image/png;base64,${pix.qrBase64}`}
            alt="QR Code do Pix"
            width={220}
            height={220}
            className={styles.qr}
            unoptimized
          />
        </div>
      )}

      <p className={`ds-body-sm ${styles.hint}`}>
        Abra o app do seu banco, escolha Pix e leia o código acima — ou copie
        o código abaixo e cole por lá.
      </p>

      {pix.qrCode && (
        <>
          <code className={styles.code}>{pix.qrCode}</code>
          <button type="button" className={styles.cta} onClick={copy}>
            {copied ? (
              <>
                <Check size={16} strokeWidth={1.5} aria-hidden />
                Código copiado
              </>
            ) : (
              <>
                <Copy size={16} strokeWidth={1.5} aria-hidden />
                Copiar código Pix
              </>
            )}
          </button>
        </>
      )}

      {remaining && (
        <p className={`ds-caption ${styles.timer}`}>
          <Clock size={14} strokeWidth={1.5} aria-hidden />
          Este código vale por mais {remaining}
        </p>
      )}

      <p className={`ds-body-sm ${styles.waiting}`} role="status" aria-live="polite">
        <Heart size={14} strokeWidth={1.5} className={styles.pulse} aria-hidden />
        Assim que o pagamento cair, esta tela segue sozinha. Pode deixar aberta.
      </p>

      {pix.ticketUrl && (
        <a
          href={pix.ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.ticket}
        >
          Abrir comprovante do Pix
        </a>
      )}
    </div>
  );
}
