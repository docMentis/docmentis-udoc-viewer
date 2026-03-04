// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },

  ssr: false,

  vite: {
    resolve: {
      alias: {
        "@": "/.",
      },
    },
    build: {
      target: "esnext",
    },
    optimizeDeps: {
      include: ["@docmentis/udoc-viewer"],
      esbuildOptions: {
        target: "esnext",
      },
    },
  },

  nitro: {
    externals: {
      inline: ["@docmentis/udoc-viewer"],
    },
  },
});
