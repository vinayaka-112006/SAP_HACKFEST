import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  cacheDir: process.env.TOOLSATHI_VITE_CACHE_DIR || "node_modules/.vite",
  server: {
    port: 5173,
    strictPort: true,
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET || "http://localhost:4004",
        changeOrigin: true,
      },
    },
  },
});
