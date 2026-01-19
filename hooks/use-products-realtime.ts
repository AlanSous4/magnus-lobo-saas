"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
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

    const supabase = createClient();

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
          if (payload.eventType === "INSERT") {
            onInsert?.(payload.new as Product);
          }

          if (payload.eventType === "UPDATE") {
            onUpdate?.(payload.new as Product);
          }

          if (payload.eventType === "DELETE") {
            onDelete?.((payload.old as Product).id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onInsert, onUpdate, onDelete]);
}
