"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Sale } from "@/types/sale";

/* =========================
    🔹 MAPA PAGAMENTO
========================= */

const paymentLabelMap: Record<string, string> = {
  credit: "Crédito",
  debit: "Débito",
  vr: "Vale Refeição",
  va: "Vale Alimentação",
  cash: "Dinheiro",
  pix: "Pix",
};

/* =========================
    🔹 HOOK FINALIZADO
========================= */

export function useSalesRealtime({ userId }: { userId: string }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setSales([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadSales() {
      // Mantém o estado atual enquanto carrega para evitar saltos na tela
      if (sales.length === 0) setLoading(true);

      /* 🚀 BUSCA UNIFICADA: 
         Buscamos vendas e itens em uma única query. 
         Note o products(name) para garantir o nome caso product_name esteja nulo.
      */
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select(`
          id,
          user_id,
          total_amount,
          created_at,
          payment_method,
          sale_items (
            id,
            quantity,
            unit_price,
            subtotal,
            is_weight,
            product_name,
            products ( name ) 
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (salesError) {
        console.error("Erro Supabase:", salesError.message);
        if (isMounted) setLoading(false);
        return;
      }

      if (!salesData) {
        if (isMounted) {
          setSales([]);
          setLoading(false);
        }
        return;
      }

      /* 📦 NORMALIZAÇÃO: 
         Tratamos os dados para o formato exato que o componente espera.
      */
      const normalizedSales: Sale[] = salesData.map((sale: any) => ({
        id: sale.id,
        user_id: sale.user_id,
        created_at: sale.created_at,
        product_id: "MULTI",
        product_name: "Venda",
        quantity: 1,
        total_value: Number(sale.total_amount) || 0,
        payment_method: sale.payment_method, // Agora enviamos o texto bruto (ex: "va + vr")

        items: (sale.sale_items || []).map((item: any) => ({
          id: item.id,
          sale_id: sale.id,
          // Prioridade 1: product_name da tabela sale_items
          // Prioridade 2: name da tabela products (via join)
          // Prioridade 3: Texto padrão "Produto"
          product_name: item.product_name || item.products?.name || "Produto",
          quantity: Number(item.quantity) || 0,
          price: Number(item.unit_price) || 0,
          is_weight: item.is_weight ?? false,
          total: Number(item.subtotal) || 0,
        })),
      }));

      if (isMounted) {
        setSales(normalizedSales);
        setLoading(false);
      }
    }

    loadSales();

    /* 📡 CONFIGURAÇÃO REALTIME */
    const channel = supabase
      .channel(`sales-sync-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
          filter: `user_id=eq.${userId}`,
        },
        () => loadSales()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sale_items" },
        () => loadSales()
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { sales, loading };
}