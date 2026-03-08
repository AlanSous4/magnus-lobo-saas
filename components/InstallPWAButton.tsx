"use client";

import { useEffect } from "react";
import { initPWAInstall } from "../lib/pwa-install";

export default function InstallPWAButton() {
  useEffect(() => {
    initPWAInstall("btn-install-pwa");
  }, []);

  return (
    <button
      id="btn-install-pwa"
      className="bg-orange-500 text-white px-4 py-2 rounded-lg fixed bottom-4 right-4 z-50 hidden"
    >
      Instalar App
    </button>
  );
}