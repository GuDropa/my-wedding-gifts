"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { Heart } from "lucide-react";
import { PixPanel, type PixData } from "@/components/PixPanel";
import styles from "./presentear.module.css";

interface Props {
  giftId: string;
  giftName: string;
  amount: number; // BRL units (não centavos)
  publicKey: string;
  guestName: string;
}

type Status = "loading" | "ready" | "submitting" | "error";

export function PaymentClient({ giftId, giftName, amount, publicKey, guestName }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [pref, setPref] = useState<{ preferenceId: string; externalReference: string; mock?: boolean } | null>(null);
  const [pix, setPix] = useState<PixData | null>(null);
  const router = useRouter();
  const mountedOnce = useRef(false);

  useEffect(() => {
    if (mountedOnce.current) return;
    mountedOnce.current = true;

    if (publicKey) {
      initMercadoPago(publicKey, { locale: "pt-BR" });
    }

    (async () => {
      try {
        const res = await fetch("/api/preference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ giftId }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? "Não conseguimos preparar o pagamento.");
        }
        const data = (await res.json()) as {
          preferenceId: string;
          externalReference: string;
          mock?: boolean;
        };
        setPref(data);
        setStatus("ready");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro inesperado");
        setStatus("error");
      }
    })();
  }, [giftId, publicKey]);

  // Modo mock: sem MP configurado, mostra botão simples que chama process-payment
  async function handleMockSubmit() {
    if (!pref) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentData: { mock: true },
          giftId,
          externalReference: pref.externalReference,
          method: "card",
        }),
      });
      const j = (await res.json()) as { status?: string; paymentId?: string; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Erro");
      if (j.status === "approved") {
        router.push(`/obrigado?p=${encodeURIComponent(j.paymentId ?? "")}&g=${encodeURIComponent(giftName)}`);
      } else {
        setError(`Pagamento ${j.status ?? "não aprovado"}`);
        setStatus("error");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      setStatus("error");
    }
  }

  if (status === "loading") {
    return (
      <div className={styles.brickLoading}>
        <Heart size={20} strokeWidth={1.5} className={styles.heartSpin} aria-hidden />
        <span>Preparando seu presente...</span>
      </div>
    );
  }

  if (status === "error" && error) {
    return (
      <div className={styles.brickError}>
        <p>{error}</p>
        <button type="button" className={styles.retry} onClick={() => location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (pix && pref) {
    return (
      <PixPanel pix={pix} externalReference={pref.externalReference} giftName={giftName} />
    );
  }

  if (pref?.mock || !publicKey) {
    return (
      <div className={styles.mock}>
        <p className={`ds-body-sm ${styles.mockNote}`}>
          Modo de demonstração — Mercado Pago não está configurado.
          <br />
          De {guestName} para Gabriely & Gustavo: <strong>R$ {amount.toFixed(2).replace(".", ",")}</strong>
        </p>
        <button
          type="button"
          className={styles.mockCta}
          onClick={handleMockSubmit}
          disabled={status === "submitting"}
        >
          {status === "submitting" ? "Processando..." : "Simular presente concluído"}
        </button>
      </div>
    );
  }

  return (
    <Payment
      initialization={{
        amount,
        preferenceId: pref?.preferenceId,
        payer: { firstName: guestName.split(" ")[0] },
      }}
      customization={{
        paymentMethods: {
          creditCard: "all",
          bankTransfer: ["pix"],
          maxInstallments: 6,
        },
        visual: {
          style: { theme: "default" },
        },
      }}
      onSubmit={async ({ formData }) => {
        if (!pref) return;
        setStatus("submitting");
        try {
          const res = await fetch("/api/process-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentData: formData,
              giftId,
              externalReference: pref.externalReference,
              method: (formData as { payment_method_id?: string }).payment_method_id === "pix" ? "pix" : "card",
            }),
          });
          const j = (await res.json()) as {
            status?: string;
            paymentId?: string;
            error?: string;
            pix?: PixData;
          };
          if (!res.ok) throw new Error(j.error ?? "Erro");
          // V28: pix pendente ainda ⊥ foi pago — mostra QR em vez de agradecer.
          if (j.pix) {
            setPix(j.pix);
            return;
          }
          if (j.status === "approved" || j.status === "pending") {
            router.push(
              `/obrigado?p=${encodeURIComponent(j.paymentId ?? "")}&g=${encodeURIComponent(giftName)}&s=${j.status}`,
            );
          } else {
            setError("Pagamento não aprovado. Tente outro método ♥");
            setStatus("error");
          }
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Erro inesperado");
          setStatus("error");
        }
      }}
      onError={(err) => {
        console.error("[Brick error]", err);
        setError("Erro no processamento. Tente novamente.");
        setStatus("error");
      }}
    />
  );
}
