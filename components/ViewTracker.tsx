"use client";

import { useEffect, useRef } from "react";

/**
 * Dispara POST /api/track/view uma vez por sessão de browser (V15).
 * Usa sessionStorage flag p/ evitar duplicação na mesma sessão de navegação.
 */
export function ViewTracker() {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("gg_view_tracked") === "1") return;

    sent.current = true;
    sessionStorage.setItem("gg_view_tracked", "1");
    fetch("/api/track/view", { method: "POST" }).catch(() => {
      // silencioso — tracking é best-effort
    });
  }, []);

  return null;
}
