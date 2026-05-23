import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: false, // Disable PWA in dev to suppress Workbox logs
        type: "module",
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/api/],
        // Exclude API routes from precaching
        globIgnores: ["**/api/**"],
        runtimeCaching: [
          {
            // All API routes go directly to network - no precaching
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkOnly",
            options: {
              cacheName: "api-cache",
            },
          },
        ],
        // Suppress Workbox verbose logs
        // Note: Workbox logs are controlled by the service worker itself
        // We'll suppress them via a custom script injection
        additionalManifestEntries: [],
      },
      includeAssets: ["favicon.ico"],
      manifest: {
        name: "Vihiga LIMS eDAMS Admin Portal",
        short_name: "Vihiga LIMS Admin",
        description:
          "Vihiga County - Electronic Development Application Management System Admin Portal",
        theme_color: "#ffffff",
        icons: [
          {
            src: "favicon.ico",
            sizes: "any",
            type: "image/x-icon",
          },
        ],
      },
    }),
    svgr(),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    css: true,
    reporters: ["verbose"],
    coverage: {
      reporter: ["text", "json", "html"],
      include: ["src/**/*"],
      exclude: [],
    },
  },
  optimizeDeps: {
    include: ["react-helmet-async"],
  },
  server: {
    port: 3000,
    host: true,
    open: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
    },
    fs: {
      strict: false,
    },
  },
});
