import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  base: "./",
  server: { proxy: { "/api": "http://127.0.0.1:3001" } },
  preview: { proxy: { "/api": "http://127.0.0.1:3001" } },
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: { output: { manualChunks: { three: ["three"] } } },
  },
});
