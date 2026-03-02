"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Sale } from "@/types/sale";

/* =========================
   🔹 TIPOS
========================= */

type SaleItem = {
  id: string;
  sale_id: string;
  product_name: string;
  quantity: number;
  price: number;
};

/* =========================
   🔹 MAPA PAGAMENTO
========================= */

const paymentLabelMap: Record<string, string> = {
  credit: "Crédito",
  debit: "Débito",
  vr: "Vale Refeição",
  va: "Vale Alimentação",
  cash: "Dinheiro",
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
        .select("id, user_id, total_amount, created_at, payment_method")
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
         2️⃣ BUSCA ITENS + JOIN EXPLÍCITO
      ========================= */

      const { data: itemsData, error: itemsError } = await supabase
        .from("sale_items")
        .select(`
          id,
          sale_id,
          quantity,
          unit_price,
          product_id,
          products!sale_items_product_id_fkey (
            name
          )
        `)
        .in("sale_id", saleIds);

      if (itemsError) {
        console.error("Erro ao buscar itens:", itemsError);
      }

      /* =========================
         3️⃣ NORMALIZA + AGRUPA ITENS POR VENDA
      ========================= */

      const normalizedItems: SaleItem[] = Array.isArray(itemsData)
        ? itemsData.map((item: any) => ({
            id: item.id,
            sale_id: item.sale_id,
            product_name: item.products?.name ?? "Produto desconhecido",
            quantity: Number(item.quantity) || 0,
            price: Number(item.unit_price) || 0,
          }))
        : [];

      // 🔹 AGRUPA POR sale_id
      const itemsBySale: Record<string, SaleItem[]> = normalizedItems.reduce(
        (acc, item) => {
          if (!acc[item.sale_id]) acc[item.sale_id] = [];
          acc[item.sale_id].push(item);
          return acc;
        },
        {} as Record<string, SaleItem[]>
      );

      /* =========================
         4️⃣ NORMALIZA VENDAS
      ========================= */

      const normalizedSales: Sale[] = salesData.map((sale) => ({
        id: sale.id,
        user_id: sale.user_id,
        created_at: sale.created_at,

        product_id: "MULTI",
        product_name: "Venda",
        quantity: 1,

        total_value: Number(sale.total_amount) || 0,

        payment_method:
          paymentLabelMap[sale.payment_method] ?? "Não informado",

        // ✅ ITENS DETALHADOS COM NOMES CORRETOS
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