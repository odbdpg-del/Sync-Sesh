import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const commitSha = (process.env.RENDER_GIT_COMMIT ?? process.env.VITE_COMMIT_SHA ?? "dev").slice(0, 7);
const appBuildId = `${process.env.npm_package_version ?? "0.1.0"}-${commitSha}`;

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_BUILD_ID__: JSON.stringify(appBuildId),
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/sync": {
        target: "ws://127.0.0.1:8787",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
