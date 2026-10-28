import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      // Modules under test import the Prisma client; no query ever runs.
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      JOURNAL_TIME_ZONE: "Europe/Sofia",
    },
  },
});
