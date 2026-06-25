import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig(({ command }) => ({
  publicDir: "public",
  plugins: [tsconfigPaths(), tanstackStart()],
  server: {
    port: 3000,
  },
  ssr: {
    // Bundle all deps only for production build so server.js is self-contained
    // (needed for Vercel deployment via Build Output API).
    // In dev, keep deps external so Vite's module runner doesn't choke on CJS modules.
    noExternal: command === "build",
  },
}));
