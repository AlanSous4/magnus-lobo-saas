"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
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
              if (newWorker.state === "installed") {
                console.log("🆕 Nova versão disponível");

                // 👇 NÃO força reload automático
                // você pode mostrar um toast depois se quiser
              }
            });
          });
        })
        .catch((err) => console.error("❌ SW erro:", err));
    }
  }, []);

  return null;
}