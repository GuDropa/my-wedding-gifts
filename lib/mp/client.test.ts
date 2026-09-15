/**
 * V29 — o branch mock de pagamento não pode existir em produção.
 * Regressão de B4: sem esse gate, deploy em prod sem `MP_ACCESS_TOKEN` fazia
 * o caminho mock gravar `Purchases.Status=approved` sem pagamento nenhum.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

async function load(env: { token?: string; nodeEnv: string }) {
  vi.resetModules();
  if (env.token) vi.stubEnv("MP_ACCESS_TOKEN", env.token);
  else vi.stubEnv("MP_ACCESS_TOKEN", "");
  vi.stubEnv("NODE_ENV", env.nodeEnv);
  return import("./client");
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("mockAllowed (V29)", () => {
  it("B4: em produção sem token → mock proibido", async () => {
    const { mockAllowed, mpConfigured } = await load({ nodeEnv: "production" });
    expect(mpConfigured()).toBe(false);
    expect(mockAllowed()).toBe(false);
  });

  it("em dev sem token → mock liberado", async () => {
    const { mockAllowed } = await load({ nodeEnv: "development" });
    expect(mockAllowed()).toBe(true);
  });

  it("em teste sem token → mock liberado", async () => {
    const { mockAllowed } = await load({ nodeEnv: "test" });
    expect(mockAllowed()).toBe(true);
  });

  it("com token configurado → mock nunca se aplica", async () => {
    for (const nodeEnv of ["production", "development"]) {
      const { mockAllowed, mpConfigured } = await load({ token: "TEST-abc", nodeEnv });
      expect(mpConfigured()).toBe(true);
      expect(mockAllowed()).toBe(false);
    }
  });
});
