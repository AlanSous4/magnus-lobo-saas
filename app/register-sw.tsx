"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("✅ SW registrado");

          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                // Quando o novo SW é ativado e assume o controle
                if (newWorker.state === "activated" && navigator.serviceWorker.controller) {
                  console.log("🚀 Nova versão detectada! Atualizando interface...");
                  window.location.reload();
                }
              });
            }
          });
        })
        .catch((err) => console.error("❌ SW erro:", err));
    }
  }, []);

  return null;
}