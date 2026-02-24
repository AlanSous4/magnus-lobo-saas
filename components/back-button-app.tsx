// components/back-button-app.tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackButtonApp() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/dashboard")}
      className="flex items-center gap-2 bg-orange-600 text-white px-3 py-1 rounded-md hover:bg-orange-700 transition"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </button>
  );
}