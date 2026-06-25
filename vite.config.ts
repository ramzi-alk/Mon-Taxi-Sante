import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig(({ command }) => ({
  publicDir: "public",
  plugins: [tsconfigPaths(), tanstackStart()],
  server: {
    port: 3000,
  },
  esbuild: {
    jsx: "automatic",
  },
  // Only bundle all deps during production build (for self-contained Vercel SSR).
  // No ssr config in dev — avoids Vite 7 bug where noExternal:false triggers
  // "filename.replace is not a function" in shouldExternalize.
  ...(command === "build" ? { ssr: { noExternal: true } } : {}),
}));
