"use client";

import { useMemo, useState, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  calculateSalesMetrics,
  Sale as MetricsSale,
  SalesMetrics,
} from "@/lib/sales-metrics";

import { useSalesRealtime } from "@/hooks/use-sales-realtime";
import type { Sale } from "@/types/sale";
import { exportSalesPDF } from "@/lib/pdf-utils";
import { Eye, FileText } from "lucide-react";

export type SalesHistoryProps = {
  type: "sales" | "revenue" | "ticket";
  groupBy: "day" | "month";
  userId: string;
};

type PeriodMode = "range" | "daily" | "month";

export function SalesHistory({ type, groupBy, userId }: SalesHistoryProps) {
  const { sales, loading } = useSalesRealtime({ userId });
  const typedSales: Sale[] = sales;

  const [days, setDays] = useState<30 | 60 | 90>(30);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("range");

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [expandedLabel, setExpandedLabel] = useState<string | null>(null);

  /* =========================
     FILTRO CENTRAL
  ========================== */

  const filteredSales = useMemo(() => {
    let filtered = typedSales;

    if (periodMode === "daily") {
      filtered = typedSales.filter(
        (s) => new Date(s.created_at).toISOString().slice(0, 10) === selectedDate
      );
    } else if (periodMode === "month") {
      filtered = typedSales.filter(
        (s) => new Date(s.created_at).toISOString().slice(0, 7) === selectedMonth
      );
    } else {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - days);
      filtered = typedSales.filter((s) => new Date(s.created_at) >= limitDate);
    }

    return filtered.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [typedSales, days, periodMode, selectedDate, selectedMonth]);

  const salesForMetrics: MetricsSale[] = filteredSales.map((s) => ({
    id: s.id,
    total_amount: s.total_value ?? 0,
    created_at: s.created_at,
  }));

  const metrics: SalesMetrics = calculateSalesMetrics(salesForMetrics, type, groupBy);

  const labelsToRender = useMemo(() => {
    if (periodMode === "daily") {
      return [selectedDate].map((d) => new Date(d).toLocaleDateString("pt-BR"));
    }

    if (periodMode === "month") {
      return [selectedMonth].map((m) => {
        const [year, month] = m.split("-");
        return `${month}/${year}`;
      });
    }

    return metrics.labels;
  }, [metrics.labels, periodMode, selectedDate, selectedMonth]);

  const handleViewPDF = async () => {
    const pdf = await exportSalesPDF(metrics, type, groupBy);
    window.open(pdf.output("bloburl"), "_blank");
  };

  const handleDownloadPDF = async () => {
    const pdf = await exportSalesPDF(metrics, type, groupBy);
    pdf.save("relatorio_vendas.pdf");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando vendas...</p>;

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <CardTitle>Relatório de {type === "sales" ? "Vendas" : type === "ticket" ? "Ticket Médio" : "Receita"}</CardTitle>

          <div className="flex gap-2 flex-wrap items-center">
            {[30, 60, 90].map((d) => (
              <Button
                key={d}
                size="sm"
                variant={periodMode === "range" && days === d ? "default" : "outline"}
                onClick={() => {
                  setPeriodMode("range");
                  setDays(d as 30 | 60 | 90);
                }}
              >
                {d} dias
              </Button>
            ))}

            <Button
              size="sm"
              variant={periodMode === "daily" ? "default" : "outline"}
              onClick={() => setPeriodMode("daily")}
            >
              Diário
            </Button>
            {periodMode === "daily" && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            )}

            <Button
              size="sm"
              variant={periodMode === "month" ? "default" : "outline"}
              onClick={() => setPeriodMode("month")}
            >
              Mês
            </Button>
            {periodMode === "month" && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            )}
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <Button size="sm" variant="outline" onClick={handleViewPDF}>
              <Eye className="mr-2 h-4 w-4" /> Visualizar PDF
            </Button>
            <Button size="sm" variant="default" onClick={handleDownloadPDF}>
              <FileText className="mr-2 h-4 w-4" /> Baixar PDF
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* RESUMO */}
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

        {/* TABELA DE VENDAS */}
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
              {labelsToRender.map((label, idx) => {
                const periodSales = filteredSales.filter((s) => {
                  if (periodMode === "daily")
                    return new Date(s.created_at).toISOString().slice(0, 10) === selectedDate;
                  if (periodMode === "month")
                    return new Date(s.created_at).toISOString().slice(0, 7) === selectedMonth;
                  return new Date(s.created_at).toLocaleDateString("pt-BR") === label;
                });

                const revenue = periodSales.reduce((sum, s) => sum + (s.total_value ?? 0), 0);
                const isOpen = expandedLabel === label;

                return (
                  <Fragment key={label}>
                    <tr
                      className="border-t cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedLabel(isOpen ? null : label)}
                    >
                      <td className="p-2">{label}</td>
                      <td className="p-2 text-right">{periodSales.length}</td>
                      <td className="p-2 text-right">R$ {revenue.toFixed(2)}</td>
                      <td className="p-2 text-right">R$ {(revenue / (periodSales.length || 1)).toFixed(2)}</td>
                    </tr>

                    {isOpen &&
                      periodSales.map((sale) => (
                        <tr key={sale.id} className="bg-muted/30">
                          <td colSpan={4} className="p-3">
                            <div className="space-y-2 text-sm border-b pb-2">
                              <div className="flex justify-between font-semibold">
                                <span>Venda: {sale.id}</span>
                                <span>Pagamento: {sale.payment_method ?? "Desconhecido"}</span>
                                <span>Total: R$ {(sale.total_value ?? 0).toFixed(2)}</span>
                              </div>

                              <div className="pl-4 space-y-1">
                                {sale.items.length > 0 ? (
                                  sale.items.map((item) => {
                                    const valor = item.price * item.quantity;
                                    return (
                                      <div
                                        key={item.id}
                                        className="grid grid-cols-3 items-center px-2 py-1 rounded hover:bg-[rgb(255,237,212)] transition-colors"
                                      >
                                        <span>{item.product_name}</span>
                                        <span className="text-center">
                                          {item.is_weight
                                            ? `${item.quantity.toFixed(3)} KG`
                                            : `${item.quantity} UN`}
                                        </span>
                                        <span className="text-right">R$ {valor.toFixed(2)}</span>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <p className="text-muted-foreground">Venda sem itens detalhados</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* GRÁFICO OCULTO PARA PDF */}
        <div
          id="sales-chart"
          className="fixed top-0 left-0 opacity-0 pointer-events-none z-50"
          style={{ width: "1200px", height: "600px" }}
        >
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2">Período</th>
                <th className="border p-2">Vendas</th>
                <th className="border p-2">Receita</th>
                <th className="border p-2">Ticket Médio</th>
              </tr>
            </thead>
            <tbody>
              {metrics.labels.map((label, idx) => (
                <tr key={label}>
                  <td className="border p-2">{label}</td>
                  <td className="border p-2">{metrics.rows[idx]?.sales ?? 0}</td>
                  <td className="border p-2">R$ {metrics.rows[idx]?.revenue.toFixed(2)}</td>
                  <td className="border p-2">R$ {metrics.rows[idx]?.ticket.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}