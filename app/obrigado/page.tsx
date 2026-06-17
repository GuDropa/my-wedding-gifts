import { redirect } from "next/navigation";
import { getGuestSession } from "@/lib/session";
import { FloralCorners } from "@/components/FloralCorners";
import { Frame } from "@/components/Frame";
import { Petals } from "./petals";
import styles from "./obrigado.module.css";

export const dynamic = "force-dynamic";

export default async function ObrigadoPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; g?: string; s?: string }>;
}) {
  const session = await getGuestSession();
  if (!session) redirect("/");

  const { g, s } = await searchParams;
  const giftName = g ?? "esse presente";
  const status = s ?? "approved";
  const first = session.name.split(" ")[0];

  return (
    <main className={styles.page}>
      <FloralCorners variant="all" opacity={0.85} size={260} />
      <Petals />
      <div className={styles.shell}>
        <Frame inset={20}>
          <article className={styles.note}>
            <p className={`ds-eyebrow ${styles.eyebrow}`}>
              {status === "pending" ? "Quase lá" : "Obrigado"}
              <span className={styles.heart}> ♥</span>
            </p>

            <h1 className={`ds-display ${styles.dear}`}>
              {first},
            </h1>

            <p className={`${styles.body} ${styles.writeIn}`}>
              {status === "pending" ? (
                <>
                  Recebemos seu presente <em>{giftName}</em> e estamos só esperando
                  a confirmação do pagamento. Assim que tudo for aprovado, ele entra
                  oficialmente na nossa história. Obrigado, de verdade, por estar com a gente.
                </>
              ) : (
                <>
                  Seu carinho acaba de virar parte da nossa casa. Obrigado por nos
                  presentear com <em>{giftName}</em> — e, mais do que isso, por
                  caminhar com a gente até esse dia. Mal podemos esperar para
                  celebrar você no dia <strong>21 / 11 / 2026</strong>.
                </>
              )}
            </p>

            <div className={styles.divider} aria-hidden />

            <p className={`ds-display ${styles.signature}`}>
              Gabriely <span className="ds-amp">e</span> Gustavo
            </p>
          </article>
        </Frame>
      </div>
    </main>
  );
}
