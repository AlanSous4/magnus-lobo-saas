"use client";

import { useMemo, useState } from "react";
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

export type SalesHistoryProps = {
  type: "sales" | "revenue" | "ticket";
  groupBy: "day" | "month";
  userId: string;
};

export function SalesHistory({ type, groupBy, userId }: SalesHistoryProps) {
  const { sales, loading } = useSalesRealtime({ userId });

  const [days, setDays] = useState<30 | 60 | 90>(30);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const filteredSales = useMemo(() => {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - days);
    return sales.filter(
      (sale) => new Date(sale.created_at) >= limitDate
    );
  }, [sales, days]);

  const salesForMetrics: MetricsSale[] = filteredSales.map((s) => ({
    id: s.id,
    total_amount: s.total_value ?? 0,
    created_at: s.created_at,
  }));

  const metrics: SalesMetrics = calculateSalesMetrics(
    salesForMetrics,
    "revenue", // 🔥 relatório sempre baseado em receita
    groupBy
  );

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
        <CardHeader className="space-y-4">
          <div className="flex justify-between items-center">
            <CardTitle>Relatório de Receita</CardTitle>

            <div className="flex gap-2">
              {[30, 60, 90].map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={days === d ? "default" : "outline"}
                  onClick={() => setDays(d as 30 | 60 | 90)}
                >
                  {d} dias
                </Button>
              ))}
            </div>
          </div>

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
          {/* ✅ RESUMO GERAL — SEMPRE VISÍVEL */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Total de vendas</strong>
              <p>{metrics.summary.totalSales}</p>
            </div>
            <div>
              <strong>Receita total</strong>
              <p>R$ {metrics.summary.totalRevenue.toFixed(2)}</p>
            </div>
            <div>
              <strong>Ticket médio</strong>
              <p>R$ {metrics.summary.averageTicket.toFixed(2)}</p>
            </div>
          </div>

          {/* ✅ TABELA — SEMPRE NO LUGAR DO GRÁFICO */}
          <div className="overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Período</th>
                  <th className="p-2 text-right">Vendas</th>
                  <th className="p-2 text-right">Receita</th>
                  <th className="p-2 text-right">Ticket Médio</th>
                </tr>
              </thead>
              <tbody>
                {metrics.labels.map((label) => {
                  const periodSales = filteredSales.filter((sale) => {
                    const date = new Date(sale.created_at);
                    return date.toLocaleDateString("pt-BR") === label;
                  });

                  const salesCount = periodSales.length;
                  const revenue = periodSales.reduce(
                    (sum, sale) => sum + (sale.total_value ?? 0),
                    0
                  );

                  return (
                    <tr key={label} className="border-t">
                      <td className="p-2">{label}</td>
                      <td className="p-2 text-right">{salesCount}</td>
                      <td className="p-2 text-right">
                        R$ {revenue.toFixed(2)}
                      </td>
                      <td className="p-2 text-right">
                        R$ {(revenue / (salesCount || 1)).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ❌ GRÁFICO NA TELA BLOQUEADO PARA 30 DIAS */}
          {days !== 30 && (
            <SalesChart
              sales={salesForMetrics}
              type={type}
              initialGroupBy={groupBy}
              chartId="sales-chart-visible"
            />
          )}
        </CardContent>
      </Card>

      {/* ✅ GRÁFICO EXCLUSIVO PARA PDF (SEMPRE EXISTE) */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "800px",
          height: "400px",
        }}
      >
        <SalesChart
          sales={salesForMetrics}
          type={type}
          initialGroupBy={groupBy}
          chartId="sales-chart"
        />
      </div>

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
