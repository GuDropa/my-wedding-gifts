"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { Heart } from "lucide-react";
import { PixPanel, type PixData } from "@/components/PixPanel";
import { paymentErrorCopy } from "@/lib/mp/status-detail";
import styles from "./presentear.module.css";

interface Props {
  giftId: string;
  giftName: string;
  amount: number; // BRL units (não centavos)
  publicKey: string;
  guestName: string;
}

type Status = "loading" | "ready" | "submitting" | "error";

// V34: o wrapper do SDK re-inicializa o Brick sempre que muda a identidade de
// `initialization`/`customization`/callbacks (são deps do useEffect dele).
// Types derivados do próprio componente — o pacote ⊥ reexporta os dele.
type PaymentProps = ComponentProps<typeof Payment>;
type PaymentFormData = Parameters<PaymentProps["onSubmit"]>[0];

export function PaymentClient({ giftId, giftName, amount, publicKey, guestName }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [pref, setPref] = useState<{ preferenceId: string; externalReference: string; mock?: boolean } | null>(null);
  const [pix, setPix] = useState<PixData | null>(null);
  // Recusa é recuperável: mensagem acima do Brick, formulário preservado.
  const [notice, setNotice] = useState<string | null>(null);
  // Doc oficial: onReady sinaliza que o Brick terminou de montar — até lá o
  // nosso loader fica de pé, senão sobra uma área vazia piscando.
  const [brickReady, setBrickReady] = useState(false);
  const router = useRouter();
  const mountedOnce = useRef(false);
  // V34: `pref` chega depois da 1ª render; lido por ref p/ manter `onSubmit`
  // estável — como dep, ele remontaria o Brick e zeraria o formulário.
  const prefRef = useRef(pref);

  useEffect(() => {
    prefRef.current = pref;
  }, [pref]);

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
        // V29: mock só quando o servidor autoriza. Sem publicKey e sem mock,
        // o Brick ⊥ inicializa — erro honesto em vez de botão de simular.
        if (!data.mock && !publicKey) {
          throw new Error("O pagamento está indisponível agora. Já estamos resolvendo ♥");
        }
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

  // ---- Props do Brick com identidade estável ∴ monta uma vez só (V34) ----
  const initialization = useMemo<PaymentProps["initialization"]>(
    () => ({
      amount,
      // V30/B5: preferenceId exigiria `paymentMethods.mercadoPago` (carteira MP,
      // que tira o convidado da página). Criamos o payment no nosso backend ∴ ⊥ usar.
      payer: {
        firstName: guestName.split(" ")[0],
        // B6: o Brick valida entityType mesmo sendo campo de PSE (Colômbia).
        entityType: "individual",
      },
    }),
    [amount, guestName],
  );

  const customization = useMemo<PaymentProps["customization"]>(
    () => ({
      paymentMethods: {
        creditCard: "all",
        bankTransfer: ["pix"],
        maxInstallments: 6,
      },
      visual: {
        style: { theme: "default" },
      },
    }),
    [],
  );

  const handleSubmit = useCallback(
    async ({ formData }: PaymentFormData) => {
      const current = prefRef.current;
      if (!current) return;
      setNotice(null);
      setStatus("submitting");
      // Doc oficial do Payment Brick: o onSubmit devolve Promise — resolve em
      // sucesso, reject em falha. Rejeitar é o que faz o Brick PRESERVAR o
      // formulário preenchido p/ o convidado corrigir e tentar de novo.
      let motivo = "Não conseguimos concluir esse pagamento. Tente de novo ♥";
      try {
        const res = await fetch("/api/process-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentData: formData,
            giftId,
            externalReference: current.externalReference,
            method:
              (formData as { payment_method_id?: string }).payment_method_id === "pix"
                ? "pix"
                : "card",
          }),
        });
        const j = (await res.json()) as {
          status?: string;
          paymentId?: string;
          statusDetail?: string | null;
          error?: string;
          pix?: PixData;
        };
        if (!res.ok) {
          motivo = j.error ?? motivo;
          throw new Error(motivo);
        }
        // V28: pix pendente ainda ⊥ foi pago — mostra QR em vez de agradecer.
        if (j.pix) {
          setPix(j.pix);
          return; // resolve — o PixPanel assume a tela
        }
        if (j.status === "approved" || j.status === "pending") {
          router.push(
            `/obrigado?p=${encodeURIComponent(j.paymentId ?? "")}&g=${encodeURIComponent(giftName)}&s=${j.status}`,
          );
          return; // resolve — overlay segue de pé até a navegação
        }
        // V31/B7: motivo concreto em vez de "não aprovado" seco.
        motivo = paymentErrorCopy(j.statusDetail);
        throw new Error(motivo);
      } catch (err) {
        setNotice(motivo);
        setStatus("ready");
        throw err; // reject — Brick mantém o formulário, ⊥ precisa recarregar
      }
    },
    [giftId, giftName, router],
  );

  const handleReady = useCallback(() => setBrickReady(true), []);

  const handleError = useCallback((err: unknown) => {
    console.error("[Brick error]", err);
    setError("Erro no processamento. Tente novamente.");
    setStatus("error");
  }, []);

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

  if (pref?.mock) {
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
    <>
      {!brickReady && (
        <div className={styles.brickLoading}>
          <Heart size={20} strokeWidth={1.5} className={styles.heartSpin} aria-hidden />
          <span>Preparando seu presente...</span>
        </div>
      )}
      {notice && (
        <p className={styles.notice} role="alert">
          {notice}
        </p>
      )}
      <div className={styles.brickStage}>
        {/* V35: MP + Airtable levam segundos — o convidado precisa ver que algo
            está acontecendo, e ⊥ conseguir clicar de novo enquanto isso. */}
        {status === "submitting" && (
          <div className={styles.brickOverlay} role="status" aria-live="polite">
            <Heart size={22} strokeWidth={1.5} className={styles.heartSpin} aria-hidden />
            <span>Confirmando seu pagamento...</span>
            <small>Isso pode levar alguns segundos. Não feche esta página ♥</small>
          </div>
        )}
        <div className={brickReady ? styles.brickMountReady : styles.brickMount}>
          <Payment
            initialization={initialization}
            customization={customization}
            onSubmit={handleSubmit}
            onReady={handleReady}
            onError={handleError}
          />
        </div>
      </div>
    </>
  );
}
