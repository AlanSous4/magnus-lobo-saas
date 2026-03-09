"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { SalesHistory } from "@/components/sales-history";
import { exportSalesPDF } from "@/lib/pdf-utils";
import type { SalesMetrics, ChartType, GroupBy } from "@/lib/sales-metrics";
import { AppBackButton } from "@/components/app-back-button";

export default function RelatorioVendasClient() {
  const searchParams = useSearchParams();

  const type: ChartType = (searchParams.get("type") as ChartType) ?? "sales";
  const groupBy: GroupBy = (searchParams.get("groupBy") as GroupBy) ?? "day";

  const [userId, setUserId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) setUserId(user.id);
    }

    loadUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    async function loadMetrics() {
      setLoadingMetrics(true);

      try {
        const { data: salesData, error } = await supabase
          .from("sales")
          .select("total_amount, created_at")
          .eq("user_id", userId);

        if (error) throw error;

        // Conversão segura para o formato esperado por calculateSalesMetrics
        const sales =
          salesData?.map((s) => ({
            total_value: Number(s.total_amount),
            created_at: s.created_at,
          })) || [];

        const { calculateSalesMetrics } = await import("@/lib/sales-metrics");

        const computedMetrics = calculateSalesMetrics(sales, type, groupBy);

        setMetrics(computedMetrics);
      } catch (err) {
        console.error("Erro ao carregar métricas:", err);
      } finally {
        setLoadingMetrics(false);
      }
    }

    loadMetrics();
  }, [userId, type, groupBy]);

  const handleViewPDF = async () => {
    if (!metrics) return;

    const pdf = await exportSalesPDF(metrics, type, groupBy);
    window.open(pdf.output("bloburl"), "_blank");
  };

  const handleDownloadPDF = async () => {
    if (!metrics) return;

    const pdf = await exportSalesPDF(metrics, type, groupBy);
    pdf.save("relatorio_vendas.pdf");
  };

  if (!userId)
    return (
      <p className="text-sm text-muted-foreground">
        Carregando usuário...
      </p>
    );

  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">
          Carregando relatório...
        </p>
      }
    >
      <div className="flex flex-col gap-4">

        {/* Botão aparece apenas no modo APP */}
        <AppBackButton />

        {loadingMetrics ? (
          <p className="text-sm text-muted-foreground">
            Carregando vendas...
          </p>
        ) : metrics ? (
          <SalesHistory
            type={type}
            groupBy={groupBy}
            userId={userId}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum dado encontrado.
          </p>
        )}

      </div>
    </Suspense>
  );
}