import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Séparé de vite.config.ts (app + SSR) pour ne jamais charger le plugin
// TanStack Start ici, et pour exclure explicitement e2e/ (suite Playwright,
// pas Vitest — voir playwright.config.ts).
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", "e2e"],
  },
});
