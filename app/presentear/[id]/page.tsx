import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getGuestSession } from "@/lib/session";
import { getGift } from "@/lib/get-gifts";
import { fmtBRL } from "@/lib/fmt";
import { PaymentClient } from "./payment-client";
import styles from "./presentear.module.css";

export const dynamic = "force-dynamic";

export default async function PresentearPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getGuestSession();
  if (!session) redirect("/");

  const { id } = await params;
  const gift = await getGift(decodeURIComponent(id));
  if (!gift) notFound();
  if (gift.soldOut) redirect("/presentes");

  const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/presentes" className={styles.back}>
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
          <span>Voltar à lista</span>
        </Link>

        <header className={styles.header}>
          <p className="ds-eyebrow">Você está presenteando</p>
          <h1 className={`ds-h1 ${styles.giftName}`}>{gift.name}</h1>
          <p className={`ds-body ${styles.desc}`}>{gift.description}</p>
          <p className={`ds-price ${styles.price}`}>{fmtBRL(gift.priceCents)}</p>
        </header>

        <section className={styles.brick}>
          <p className={`ds-eyebrow ${styles.brickEyebrow}`}>Concluir presente</p>
          <p className={`ds-body-sm ${styles.brickHint}`}>
            Pague no cartão ou no Pix — o valor cai direto na nossa conta ♥
          </p>
          <PaymentClient
            giftId={gift.id}
            giftName={gift.name}
            amount={gift.priceCents / 100}
            publicKey={publicKey}
            guestName={session.name}
          />
        </section>
      </div>
    </main>
  );
}
