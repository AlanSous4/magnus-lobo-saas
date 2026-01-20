"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Sale } from "@/types/sale";

export function useSalesRealtime({ userId }: { userId: string }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setSales([]);
      setLoading(false);
      return;
    }

    async function loadSales() {
      setLoading(true);

      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          user_id,
          total_amount,
          created_at
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar vendas:", error);
        setSales([]);
      } else {
        // ✅ NORMALIZAÇÃO AQUI (PONTO-CHAVE)
        const normalized: Sale[] = (data ?? []).map((s) => ({
          id: s.id,
          user_id: s.user_id,
          product_id: "N/A",
          product_name: "Venda",
          quantity: 1,
          total_value: Number(s.total_amount), // 🔥 AQUI ESTÁ A CORREÇÃO
          created_at: s.created_at,
        }));

        setSales(normalized);
      }

      setLoading(false);
    }

    loadSales();
  }, [userId]);

  return { sales, loading };
}
