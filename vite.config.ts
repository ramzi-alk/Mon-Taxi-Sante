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
  //
  // sharp is kept external: it ships a native .node binary (per-platform,
  // via optional deps like @img/sharp-linux-x64) that Rollup cannot inline
  // into server.js. Left as a real `require`/`import "sharp"`, resolved at
  // runtime from node_modules — scripts/vercel-build.mjs copies sharp's
  // real (symlink-dereferenced) directory next to server.js for this.
  ...(command === "build" ? { ssr: { noExternal: true, external: ["sharp"] } } : {}),
}));
