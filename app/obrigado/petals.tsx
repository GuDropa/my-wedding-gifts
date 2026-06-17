"use client";

import { useEffect, useState } from "react";
import styles from "./obrigado.module.css";

// V17: motion lento e suave — pétalas drifting, sem bounce.
export function Petals() {
  const [petals, setPetals] = useState<
    { id: number; left: number; delay: number; dur: number; rot: number; size: number }[]
  >([]);

  useEffect(() => {
    const items = Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 4,
      dur: 9 + Math.random() * 6,
      rot: Math.random() * 360,
      size: 8 + Math.random() * 10,
    }));
    setPetals(items);
  }, []);

  return (
    <div className={styles.petalLayer} aria-hidden>
      {petals.map((p) => (
        <span
          key={p.id}
          className={styles.petal}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}
