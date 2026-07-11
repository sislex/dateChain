/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Backend routes live at the root (/auth, /health, …); strip the /api prefix.
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/socket.io": { target: "http://localhost:3000", ws: true },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setup-tests.ts"],
    css: false,
    // Vitest owns unit tests under src/; Playwright owns tests/e2e/.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
