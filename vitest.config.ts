import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
    // El mundo hace bastante por tick; algunos tests corren miles de ticks.
    testTimeout: 30000,
  },
});
