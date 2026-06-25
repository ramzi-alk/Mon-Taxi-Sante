import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  publicDir: "public",
  plugins: [tsconfigPaths(), tanstackStart()],
  server: {
    port: 3000,
  },
});
