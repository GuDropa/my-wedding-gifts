import { redirect } from "next/navigation";
import Image from "next/image";
import { getGuestSession } from "@/lib/session";
import { getGifts } from "@/lib/get-gifts";
import { HeaderBar } from "@/components/HeaderBar";
import { GiftCard } from "@/components/GiftCard";
import { ViewTracker } from "@/components/ViewTracker";
import { FloralCorners } from "@/components/FloralCorners";
import styles from "./presentes.module.css";

export const dynamic = "force-dynamic";

export default async function PresentesPage() {
  const session = await getGuestSession();
  if (!session) redirect("/");

  const gifts = await getGifts();
  const givenCount = gifts.filter((g) => g.soldOut).length;
  const totalCount = gifts.length;

  return (
    <main className={styles.page}>
      <FloralCorners variant="tl-br" opacity={0.35} size={220} />
      <ViewTracker />
      <HeaderBar guestName={session.name} />

      <section className={styles.intro}>
        <p className="ds-eyebrow">Nossa lista de presentes</p>
        <h1 className={`ds-h1 ${styles.title}`}>
          Escolha um presente, <span className={styles.italic}>com carinho</span>
        </h1>
        <p className={`ds-body ${styles.intro__body}`}>
          Cada item daqui ajuda a montar a nossa casa e os nossos primeiros dias
          juntos. Não se preocupe com valor — o seu carinho já é tudo ♥
        </p>
        <div className={styles.divider} aria-hidden>
          <Image
            src="/assets/divider-leaf.png"
            alt=""
            width={120}
            height={24}
            className={styles.dividerImg}
          />
        </div>
        <p className={`ds-caption ${styles.summary}`}>
          {givenCount} de {totalCount} já presenteados
        </p>
      </section>

      <section className={styles.grid}>
        {gifts.length === 0 ? (
          <p className={`ds-body ${styles.empty}`}>
            Estamos preparando a lista com muito carinho — volte em breve.
          </p>
        ) : (
          gifts.map((g) => <GiftCard key={g.id} gift={g} />)
        )}
      </section>
    </main>
  );
}
