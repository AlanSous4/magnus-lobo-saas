"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client"; // ✅ instância única
import { Product } from "@/types/product";

type Params = {
  userId: string;
  onInsert?: (product: Product) => void;
  onUpdate?: (product: Product) => void;
  onDelete?: (id: string) => void;
};

export function useProductsRealtime({
  userId,
  onInsert,
  onUpdate,
  onDelete,
}: Params) {
  useEffect(() => {
    if (!userId) return;

    // ✅ usa a instância única do supabase
    const channel = supabase
      .channel("products-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          switch (payload.eventType) {
            case "INSERT":
              onInsert?.(payload.new as Product);
              break;
            case "UPDATE":
              onUpdate?.(payload.new as Product);
              break;
            case "DELETE":
              onDelete?.((payload.old as Product).id);
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onInsert, onUpdate, onDelete]);
}
