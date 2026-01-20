"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

// 🔹 Exportando o tipo Sale diretamente aqui
export type Sale = {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  total_value: number;
  created_at: string;
};

interface Params {
  userId: string;
  onInsert?: (sale: Sale) => void;
  onUpdate?: (sale: Sale) => void;
  onDelete?: (id: string) => void;
}

export function useSalesRealtime({ userId, onInsert, onUpdate, onDelete }: Params) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    async function loadInitialSales() {
      setLoading(true);
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("user_id", userId);

      if (!error && data) {
        setSales(data as Sale[]);
      }
      setLoading(false);
    }

    loadInitialSales();

    const channel = supabase
      .channel("sales-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales" },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const newSale = payload.new as Sale;
            setSales((prev) => [...prev, newSale]);
            onInsert?.(newSale);
          }
          if (payload.eventType === "UPDATE" && payload.new) {
            const updatedSale = payload.new as Sale;
            setSales((prev) =>
              prev.map((s) => (s.id === updatedSale.id ? updatedSale : s))
            );
            onUpdate?.(updatedSale);
          }
          if (payload.eventType === "DELETE" && payload.old) {
            const deletedId = (payload.old as Sale).id;
            setSales((prev) => prev.filter((s) => s.id !== deletedId));
            onDelete?.(deletedId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onInsert, onUpdate, onDelete]);

  return { sales, loading };
}
