import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    exclude: ["@docmentis/udoc-viewer"],
  },
});
