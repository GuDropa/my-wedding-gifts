import { redirect } from "next/navigation";
import { getGuestSession } from "@/lib/session";
import { getGuests } from "@/lib/get-guests";
import { FloralCorners } from "@/components/FloralCorners";
import { Frame } from "@/components/Frame";
import { IdentifyClient } from "./identify-client";
import styles from "./identify.module.css";

export default async function HomePage() {
  // Se já identificado, vai direto p/ lista
  const session = await getGuestSession();
  if (session) redirect("/presentes");

  const guests = await getGuests();

  return (
    <main className={styles.page}>
      <FloralCorners variant="tl-br" opacity={0.95} size={280} />
      <div className={styles.shell}>
        <Frame>
          <header className={styles.hero}>
            <h1 className={`ds-display ${styles.names}`}>
              Gabriely <div className="ds-amp">e</div> Gustavo
            </h1>
            <div className={styles.meta}>
              <p className="ds-eyebrow">21 / 11 / 2026</p>
              <p className={`ds-body-sm ${styles.venue}`}>
                Espaço Eden · Rua Miguel Losso 1700 · Guarapuava, PR
              </p>
            </div>
          </header>

          <div className={styles.divider} aria-hidden>
            <span>♥</span>
          </div>

          <section className={styles.identifyBlock}>
            <h2 className={`ds-h2 ${styles.subhead}`}>
              Selecione seu nome para entrar
            </h2>
            <IdentifyClient guests={guests} />
          </section>
        </Frame>
      </div>
    </main>
  );
}
