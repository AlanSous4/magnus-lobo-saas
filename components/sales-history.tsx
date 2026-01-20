"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SalesChart } from "@/components/sales-chart";
import { exportSalesPDF } from "@/components/pdf-export";

import {
  calculateSalesMetrics,
  Sale as MetricsSale,
  SalesMetrics,
} from "@/lib/sales-metrics";

import { useSalesRealtime } from "@/hooks/use-sales-realtime";
import type { Sale } from "@/types/sale"; // ✅ tipo único e correto

export type SalesHistoryProps = {
  type: "sales" | "revenue" | "ticket";
  groupBy: "day" | "month";
  userId: string;
};

export function SalesHistory({ type, groupBy, userId }: SalesHistoryProps) {
  const { sales, loading } = useSalesRealtime({ userId });

  const salesForMetrics: MetricsSale[] = sales.map((s) => ({
    id: s.id,
  
    // ✅ MetricsSale espera total_amount
    // ✅ Sale tem total_value
    // ✅ Conversão correta e segura
    total_amount: s.total_value ?? 0,
  
    created_at: s.created_at,
  }));
  
  
  

  const metrics: SalesMetrics = calculateSalesMetrics(
    salesForMetrics,
    type,
    groupBy
  );

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handlePreviewPDF() {
    setExporting(true);
    try {
      const pdf = await exportSalesPDF(metrics, type, groupBy);
      setPreviewUrl(pdf.output("bloburl").toString());
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPDF() {
    setExporting(true);
    try {
      const pdf = await exportSalesPDF(metrics, type, groupBy);
      pdf.save("relatorio-vendas.pdf");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">
        Carregando vendas...
      </p>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {type === "sales"
              ? "Quantidade de Vendas"
              : type === "ticket"
              ? "Ticket Médio"
              : "Faturamento"}
          </CardTitle>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreviewPDF}
              disabled={exporting}
            >
              {exporting ? "Gerando..." : "Pré-visualizar PDF"}
            </Button>
            <Button onClick={handleExportPDF} disabled={exporting}>
              {exporting ? "Gerando..." : "Exportar PDF"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <SalesChart
            sales={salesForMetrics}
            type={type}
            initialGroupBy={groupBy}
          />

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Total</strong>
              <p>{metrics.summary.totalSales}</p>
            </div>
            <div>
              <strong>Média</strong>
              <p>{metrics.summary.averageTicket.toFixed(2)}</p>
            </div>
            <div>
              <strong>Períodos</strong>
              <p>{metrics.labels.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {previewUrl && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white w-[90%] h-[90%] rounded-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-3 border-b">
              <strong>Pré-visualização do PDF</strong>
              <Button
                variant="ghost"
                onClick={() => setPreviewUrl(null)}
              >
                Fechar
              </Button>
            </div>
            <iframe src={previewUrl} className="flex-1 w-full" />
          </div>
        </div>
      )}
    </>
  );
}
