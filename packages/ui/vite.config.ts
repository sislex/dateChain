import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Library-mode build for the shared UI kit.
 * React/React-DOM stay external — the consuming app provides them.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime", "framer-motion"],
    },
    cssCodeSplit: false,
    sourcemap: true,
  },
});
