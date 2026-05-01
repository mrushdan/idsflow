import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Build output goes into the backend's static folder so Flask can serve it directly.
  // Path is relative to this file (frontend/vite.config.ts) → ../backend/static.
  build: {
    outDir: "../backend/static",
    emptyOutDir: true,
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // In dev, proxy /api/* to the Flask backend running on 5555.
    // In production, both are served from the same origin (no proxy needed).
    proxy: {
      "/api": {
        target: "http://localhost:5555",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
}));
