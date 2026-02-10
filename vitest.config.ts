import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "tests/", "**/*.config.{ts,js}", "**/*.d.ts"],
    },
    deps: {
      optimizer: {
        web: {
          include: ["vitest > @vitest/ui", "vitest > jsdom"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname),
    },
  },
  optimizeDeps: {
    include: ["jsdom"],
  },
});
