"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AppBackButton() {
  const router = useRouter();
  const [isAppMode, setIsAppMode] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

    // Safari iOS
    const isIOSStandalone = (window.navigator as any).standalone === true;

    setIsAppMode(isStandalone || isIOSStandalone);
  }, []);

  if (!isAppMode) return null;

  return (
    <Button
      variant="outline"
      className="mb-4 cursor-pointer"
      onClick={() => router.push("/dashboard")}
    >
      ← Voltar ao Dashboard
    </Button>
  );
}