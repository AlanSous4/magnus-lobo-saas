"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    // ❌ NÃO registra em desenvolvimento
    if (process.env.NODE_ENV !== "production") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("✅ SW registrado");

          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;

            if (!newWorker) return;

            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "activated" &&
                navigator.serviceWorker.controller
              ) {
                console.log("🚀 Nova versão detectada! Atualizando interface...");
                window.location.reload();
              }
            });
          });
        })
        .catch((err) => console.error("❌ SW erro:", err));
    }
  }, []);

  return null;
}