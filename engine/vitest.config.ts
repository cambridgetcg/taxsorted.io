import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "core/**/__tests__/**/*.test.ts",
      "jurisdictions/**/__tests__/**/*.test.ts",
    ],
  },
});
