import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // `server-only` lança por design fora do runtime React Server.
      "server-only": root + "node_modules/server-only/empty.js",
      "@": root,
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
