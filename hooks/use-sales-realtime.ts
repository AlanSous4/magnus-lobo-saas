"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Sale } from "@/types/sale";

/* =========================
   🔹 TIPOS INTERNOS
========================= */

type SaleItem = {
  id: string;
  sale_id: string;
  product_name: string;
  quantity: number;
  price: number;
};

/* =========================
   🔹 HOOK
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
      setLoading(true);

      /* =========================
         1️⃣ BUSCA VENDAS
      ========================= */

      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("id, user_id, total_amount, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (salesError || !salesData) {
        console.error("Erro ao buscar vendas:", salesError);
        if (isMounted) {
          setSales([]);
          setLoading(false);
        }
        return;
      }

      if (salesData.length === 0) {
        if (isMounted) {
          setSales([]);
          setLoading(false);
        }
        return;
      }

      const saleIds = salesData.map((s) => s.id);

      /* =========================
         2️⃣ BUSCA ITENS (JOIN PRODUCTS)
      ========================= */

      const { data: itemsData, error: itemsError } = await supabase
        .from("sale_items")
        .select(`
          id,
          sale_id,
          quantity,
          unit_price,
          products (
            name
          )
        `)
        .in("sale_id", saleIds);

      if (itemsError) {
        console.error("Erro ao buscar itens:", itemsError);
      }

      /* =========================
         3️⃣ NORMALIZA ITENS
      ========================= */

      const normalizedItems: SaleItem[] = Array.isArray(itemsData)
        ? itemsData.map((item: any) => ({
            id: item.id,
            sale_id: item.sale_id,
            product_name: item.products?.name ?? "Produto",
            quantity: Number(item.quantity) || 0,
            price: Number(item.unit_price) || 0,
          }))
        : [];

      const itemsBySale = normalizedItems.reduce<Record<string, SaleItem[]>>(
        (acc, item) => {
          if (!acc[item.sale_id]) acc[item.sale_id] = [];
          acc[item.sale_id].push(item);
          return acc;
        },
        {}
      );

      /* =========================
         4️⃣ NORMALIZA PARA Sale
      ========================= */

      const normalizedSales: Sale[] = salesData.map((sale) => ({
        id: sale.id,
        user_id: sale.user_id,
        created_at: sale.created_at,

        // Campos exigidos pelo tipo Sale
        product_id: "MULTI",
        product_name: "Venda",
        quantity: 1,

        total_value: Number(sale.total_amount) || 0,

        // ✅ Itens detalhados
        items: itemsBySale[sale.id] ?? [],
      }));

      if (isMounted) {
        setSales(normalizedSales);
        setLoading(false);
      }
    }

    loadSales();

    /* =========================
       🔥 REALTIME
    ========================= */

    const channel = supabase
      .channel("sales-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales" },
        loadSales
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sale_items" },
        loadSales
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { sales, loading };
}