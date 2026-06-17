/**
 * GiftCard — card individual de presente.
 * V2/V14: sold-out (claimed >= limit) → dim + CTA disabled + copy específica.
 * V6: preço via fmtBRL. V20: ícones Lucide stroke 1.5.
 */
import Link from "next/link";
import Image from "next/image";
import { Gift as GiftIcon, Image as ImageIcon } from "lucide-react";
import { fmtBRL } from "@/lib/fmt";
import type { PublicGift } from "@/lib/get-gifts";
import styles from "./GiftCard.module.css";

const SOLD_OUT_COPY = "Esse presente já foi todo escolhido com carinho ♥";

export function GiftCard({ gift }: { gift: PublicGift }) {
  const remaining = Math.max(0, gift.limit - gift.claimed);
  const soldOut = gift.soldOut || remaining === 0;

  return (
    <article
      className={`${styles.card} ${soldOut ? styles.soldOut : ""}`}
      aria-disabled={soldOut}
    >
      <div className={styles.photo} style={{ background: gift.tint }}>
        {gift.photo ? (
          <Image
            src={gift.photo}
            alt={gift.name}
            fill
            sizes="(max-width: 640px) 100vw, 320px"
            className={styles.photoImg}
          />
        ) : (
          <ImageIcon
            size={36}
            strokeWidth={1.5}
            className={styles.photoIcon}
            aria-hidden
          />
        )}
      </div>

      <div className={styles.body}>
        <h3 className={`ds-h3 ${styles.name}`}>{gift.name}</h3>
        <p className={`ds-body-sm ${styles.desc}`}>{gift.description}</p>

        <div className={styles.meta}>
          <span className={`ds-price ${styles.price}`}>{fmtBRL(gift.priceCents)}</span>
          {!soldOut && remaining > 0 && (
            <span className={`ds-caption ${styles.availability}`}>
              {remaining} {remaining === 1 ? "disponível" : "disponíveis"}
            </span>
          )}
        </div>

        {soldOut ? (
          <p className={styles.soldOutCopy}>{SOLD_OUT_COPY}</p>
        ) : (
          <Link
            href={`/presentear/${encodeURIComponent(gift.id)}`}
            className={styles.cta}
          >
            <GiftIcon size={16} strokeWidth={1.5} aria-hidden />
            <span>Presentear</span>
          </Link>
        )}
      </div>
    </article>
  );
}
