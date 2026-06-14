import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { getRouter } from "./router";
import "./styles.css";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

const router = getRouter();

if (Capacitor.isNativePlatform()) {
  CapApp.addListener("backButton", ({ canGoBack }) => {
    if (window.history.length > 1 || canGoBack) {
      window.history.back();
    } else {
      CapApp.exitApp();
    }
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

// Suppress browser install prompt / "Tap to copy URL" banners.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); });
}

// Service worker: production only, never inside Lovable preview/iframe.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovable.app") && host.includes("preview") ||
    host === "localhost";

  if (isInIframe || isPreviewHost) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
  } else if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
}