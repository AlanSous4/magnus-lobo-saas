"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProductsRealtime } from "@/hooks/use-products-realtime";

export function ProductsRealtimeListener({ userId }: { userId: string }) {
  const router = useRouter();

  const handleChange = useCallback(() => {
    router.refresh();
  }, [router]);

  useProductsRealtime({
    userId,
    onInsert: handleChange,
    onUpdate: handleChange,
    onDelete: handleChange,
  });

  return null;
}
