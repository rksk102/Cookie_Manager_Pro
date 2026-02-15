import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname),
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    exclude: ["**/node_modules/**", "**/tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
    },
  },
  resolve: {
    alias: {
      "~utils/cleanup": path.resolve(__dirname, "utils/cleanup.ts"),
      "~utils": path.resolve(__dirname, "utils.ts"),
      "~": path.resolve(__dirname),
      "~store": path.resolve(__dirname, "store.ts"),
      "~types": path.resolve(__dirname, "types/index.ts"),
      "~constants": path.resolve(__dirname, "constants.ts"),
      "~components": path.resolve(__dirname, "components"),
      "~hooks": path.resolve(__dirname, "hooks"),
    },
  },
});
