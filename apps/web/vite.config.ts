import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  // Keep the proxy aligned with the API port in the root .env file.
  // These server-only values are never passed to the browser.
  const env = loadEnv(
    mode,
    decodeURIComponent(new URL("../../", import.meta.url).pathname),
    "",
  );
  const port = env.PORT ?? "3001";
  const proxy = {
    "/api": { target: `http://127.0.0.1:${port}`, changeOrigin: false },
  };
  return {
    base: "./",
    server: { proxy },
    preview: { proxy },
    plugins: [react(), tailwindcss()],
  };
});
