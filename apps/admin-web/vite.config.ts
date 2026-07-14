/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // expose on the LAN (e.g. to test from a phone)
    port: 5174,
    proxy: {
      // Backend routes live at the root (/auth, /admin, …); strip the /api prefix.
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
