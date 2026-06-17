/**
 * Cantos florais cropados do convite (V10: reuso, ⊥ redesenhar).
 * Default: top-left + bottom-right (a disposição diagonal do README).
 */
import Image from "next/image";
import styles from "./FloralCorners.module.css";

type Props = {
  variant?: "tl-br" | "tr-bl" | "all";
  opacity?: number;
  size?: number; // em px, lado maior
};

export function FloralCorners({ variant = "tl-br", opacity = 1, size = 240 }: Props) {
  const showTL = variant === "tl-br" || variant === "all";
  const showBR = variant === "tl-br" || variant === "all";
  const showTR = variant === "tr-bl" || variant === "all";
  const showBL = variant === "tr-bl" || variant === "all";
  return (
    <div className={styles.layer} aria-hidden style={{ opacity }}>
      {showTL && (
        <Image
          src="/assets/floral-corner-tl.png"
          alt=""
          width={size}
          height={size}
          className={`${styles.corner} ${styles.tl}`}
          priority
        />
      )}
      {showBR && (
        <Image
          src="/assets/floral-corner-br.png"
          alt=""
          width={size}
          height={size}
          className={`${styles.corner} ${styles.br}`}
        />
      )}
      {showTR && (
        <Image
          src="/assets/floral-corner-br.png"
          alt=""
          width={size}
          height={size}
          className={`${styles.corner} ${styles.tr}`}
          style={{ transform: "scaleX(-1)" }}
        />
      )}
      {showBL && (
        <Image
          src="/assets/floral-corner-tl.png"
          alt=""
          width={size}
          height={size}
          className={`${styles.corner} ${styles.bl}`}
          style={{ transform: "scaleX(-1)" }}
        />
      )}
    </div>
  );
}
