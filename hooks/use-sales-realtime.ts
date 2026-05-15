"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, refreshSupabaseSession } from "@/lib/supabase/client";
import type { Sale } from "@/types/sale";

/* =========================
    MAPA PAGAMENTO
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
    HOOK FINALIZADO (COM FILTRO DE DATA)
========================= */

interface UseSalesProps {
  userId: string;
  startDate?: string; // Formato YYYY-MM-DD
  endDate?: string;   // Formato YYYY-MM-DD
}

export function useSalesRealtime({ userId, startDate, endDate }: UseSalesProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSales = useCallback(async () => {
    if (!userId) {
      setSales([]);
      setLoading(false);
      return;
    }

    // Verifica se a sessão ainda é válida antes de buscar dados
    const isSessionValid = await refreshSupabaseSession();
    if (!isSessionValid) {
      console.warn("[useSalesRealtime] Sessão inválida, abortando busca");
      setLoading(false);
      return;
    }

    setLoading(true);

    let query = supabase
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
      .eq("user_id", userId);

    if (startDate) {
      query = query.gte("created_at", `${startDate}T00:00:00+00:00`);
    }
    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59+00:00`);
    }

    const { data: salesData, error: salesError } = await query
      .order("created_at", { ascending: false })
      .range(0, 5000);

    if (salesError) {
      console.error("Erro Supabase:", salesError.message);
      setLoading(false);
      return;
    }

    if (!salesData) {
      setSales([]);
      setLoading(false);
      return;
    }

    const normalizedSales: Sale[] = salesData.map((sale: any) => ({
      id: sale.id,
      user_id: sale.user_id,
      created_at: sale.created_at,
      product_id: "MULTI",
      product_name: "Venda",
      quantity: 1,
      total_value: Number(sale.total_amount) || 0,
      payment_method: sale.payment_method,

      items: (sale.sale_items || []).map((item: any) => ({
        id: item.id,
        sale_id: sale.id,
        product_name: item.product_name || item.products?.name || "Produto",
        quantity: Number(item.quantity) || 0,
        price: Number(item.unit_price) || 0,
        is_weight: item.is_weight ?? false,
        total: Number(item.subtotal) || 0,
      })),
    }));

    setSales(normalizedSales);
    setLoading(false);
  }, [userId, startDate, endDate]);

  useEffect(() => {
    if (!userId) {
      setSales([]);
      setLoading(false);
      return;
    }

    loadSales();

    const channel = supabase
      .channel(`sales-sync-${userId}-${startDate}-${endDate}`)
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
      supabase.removeChannel(channel);
    };
  }, [userId, startDate, endDate, loadSales]);

  return { sales, loading, refresh: loadSales };
}
