"use client";

import { createClient } from "@/lib/supabase/client";
import { Sale } from "@/types/sale";
import { useEffect } from "react";

type Params = {
  userId: string;
  onInsert: (sale: Sale) => void;
  onUpdate: (sale: Sale) => void;
  onDelete: (id: string) => void;
};

export function useSalesRealtime({
  userId,
  onInsert,
  onUpdate,
  onDelete,
}: Params) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("sales-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            onInsert(payload.new as Sale);
          }

          if (payload.eventType === "UPDATE") {
            onUpdate(payload.new as Sale);
          }

          if (payload.eventType === "DELETE") {
            onDelete(
              (payload.old as { id: string }).id
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onInsert, onUpdate, onDelete]);
}
