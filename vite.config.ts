import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => {
  const proxy = {
    "/api": {
      target:
        mode === "test" ? "http://127.0.0.1:8001" : "http://127.0.0.1:8000",
      changeOrigin: true,
    },
  };
  const headers = {
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "frame-ancestors 'none'",
  };
  return {
    plugins: [vue()],
    server: { port: 5173, strictPort: true, proxy, headers },
    preview: { proxy, headers },
  };
});
