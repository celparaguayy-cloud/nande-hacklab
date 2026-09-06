import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
    // El mundo hace bastante por tick; algunos tests corren miles de ticks.
    testTimeout: 30000,
    // La suite WorldEngine simula 4000 ticks en un beforeAll; el hook
    // necesita el mismo margen que los tests (el default de 10s no alcanza).
    hookTimeout: 30000,
  },
});
