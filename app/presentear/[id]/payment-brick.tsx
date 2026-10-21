"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { loadMercadoPago } from "@mercadopago/sdk-js";
import type { Payment } from "@mercadopago/sdk-react";

/**
 * V47/B20: Payment Brick montado por nós em vez do `<Payment>` do sdk-react.
 *
 * O formulário do Brick (e-mail, titular, documento…) vive em stores globais do
 * bundle do MP, compartilhadas por toda instância viva na página. O wrapper só
 * guarda o controller em `window.paymentBrickController` DEPOIS do `create`
 * assíncrono — desmontar antes disso (rede lenta de celular, voltar à lista)
 * deixava uma instância órfã que seguia escrevendo valores vazios nessas stores
 * ∴ o campo mostrava o texto e o Brick acusava "Dado obrigatório".
 *
 * Aqui: no máximo 1 Brick vivo — cada montagem espera a anterior ser desmontada,
 * e cada uma tem seu próprio container (o `unmount` do MP zera o `innerHTML`).
 */

type PaymentProps = ComponentProps<typeof Payment>;

interface BrickController {
  unmount: () => void;
}

interface MercadoPagoInstance {
  bricks: () => {
    create: (brick: "payment", containerId: string, settings: object) => Promise<BrickController>;
  };
}

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options: { locale: string }) => MercadoPagoInstance;
  }
}

let instance: { publicKey: string; mp: MercadoPagoInstance } | null = null;
let alive: Promise<void> = Promise.resolve();
let seq = 0;

async function getMercadoPago(publicKey: string): Promise<MercadoPagoInstance> {
  if (instance?.publicKey === publicKey) return instance.mp;
  await loadMercadoPago();
  if (!window.MercadoPago) throw new Error("MercadoPago.js indisponível");
  instance = { publicKey, mp: new window.MercadoPago(publicKey, { locale: "pt-BR" }) };
  return instance.mp;
}

interface Props {
  publicKey: string;
  initialization: PaymentProps["initialization"];
  customization: PaymentProps["customization"];
  onSubmit: PaymentProps["onSubmit"];
  onReady: NonNullable<PaymentProps["onReady"]>;
  onError: NonNullable<PaymentProps["onError"]>;
}

export function PaymentBrick({ publicKey, initialization, customization, onSubmit, onReady, onError }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Callbacks lidos por ref: o Brick monta uma vez e sempre chama a versão atual.
  const callbacks = useRef({ onSubmit, onReady, onError });
  useEffect(() => {
    callbacks.current = { onSubmit, onReady, onError };
  });
  // Dados de montagem também por ref — mudar depois ⊥ deve remontar o formulário.
  const settings = useRef({ initialization, customization });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const container = document.createElement("div");
    container.id = `paymentBrick_${++seq}`;
    host.appendChild(container);

    const previous = alive;
    let release!: () => void;
    alive = new Promise<void>((resolve) => (release = resolve));

    let controller: BrickController | undefined;
    let tornDown = false;
    (async () => {
      try {
        await previous;
        if (cancelled) return;
        const mp = await getMercadoPago(publicKey);
        if (cancelled) return;
        controller = await mp.bricks().create("payment", container.id, {
          ...settings.current,
          callbacks: {
            onSubmit: (...args: Parameters<Props["onSubmit"]>) => callbacks.current.onSubmit(...args),
            onReady: () => {
              if (!cancelled) callbacks.current.onReady();
            },
            onError: (err: Parameters<Props["onError"]>[0]) => callbacks.current.onError(err),
          },
        });
        // chave inválida & afins: o MP só loga e resolve `undefined`
        if (!controller) throw new Error("Bricks.create não devolveu o controller");
      } catch (err) {
        if (!cancelled) {
          callbacks.current.onError({
            type: "critical",
            cause: "brick_init_failed",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      } finally {
        // cancelado no meio do `create`, ou falhou → libera a próxima montagem já
        if (cancelled || !controller) teardown();
      }
    })();

    function teardown() {
      if (tornDown) return;
      tornDown = true;
      try {
        controller?.unmount();
      } catch {
        // já desmontado
      }
      container.remove();
      release();
    }

    return () => {
      cancelled = true;
      // `create` ainda em andamento → o `finally` acima desmonta quando terminar
      if (controller) teardown();
    };
  }, [publicKey]);

  return <div ref={hostRef} />;
}
