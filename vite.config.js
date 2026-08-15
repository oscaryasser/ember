import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Web/PWA is served from GitHub Pages under /ember/. The native (Capacitor)
// build loads assets locally (capacitor://localhost / file://), so it needs a
// RELATIVE base. Gate on CAP_BUILD: the default `npm run build` — used by CI,
// the smoke gate and the Pages deploy — is untouched and still emits /ember/.
const isNative = process.env.CAP_BUILD === "1";

export default defineConfig({
  base: isNative ? "./" : "/ember/",
  plugins: [
    react(),
    VitePWA({
      // No service worker in the native app: Capacitor already bundles every
      // asset locally, and a SW inside the persistent WKWebView serves stale
      // content and interferes with Capacitor's fetches (it broke HealthKit and
      // masked code updates). PWA/offline stays on for the web build only.
      disable: isNative,
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png", "favicon.svg"],
      manifest: {
        name: "Ember — Recomp Coach",
        short_name: "Ember",
        description: "Body recomposition coach: runs, lifts, calories, verdicts.",
        start_url: ".",
        scope: ".",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0C0E12",
        theme_color: "#0C0E12",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
