"use client";

import { SalesChart } from "@/components/sales-chart";
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
import { exportSalesPDF } from "@/components/pdf-export";
import { Eye, FileText } from "lucide-react";

export type SalesHistoryProps = {
  type: "sales" | "revenue" | "ticket";
  groupBy: "day" | "month";
  userId: string;
};

type PeriodMode = "range" | "daily" | "month";

/* =========================
   TIMEZONE FIX
========================= */

function getLocalDate(date: string | Date) {
  return new Date(date).toLocaleDateString("sv-SE", {
    timeZone: "America/Sao_Paulo",
  });
}

function getLocalMonth(date: string | Date) {
  return getLocalDate(date).slice(0, 7);
}

function formatBR(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

/* =========================
   NOVO: FORMATA HORA
========================= */

function formatHour(date: string | Date) {
  return new Date(date).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================
   NOVO: FORMATA MOEDA (R$)
========================= */
function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function SalesHistory({ type, groupBy, userId }: SalesHistoryProps) {
  const { sales, loading } = useSalesRealtime({ userId });

  /* =========================
     NORMALIZAÇÃO DE DADOS
  ========================= */

  const typedSales: Sale[] = useMemo(() => {
    return sales.map((s: any) => ({
      ...s,
      total_value: s.total_value ?? s.total_amount ?? 0,
      items: s.items ?? [],
    }));
  }, [sales]);

  const [days, setDays] = useState<30 | 60 | 90>(30);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("range");

  const [selectedDate, setSelectedDate] = useState(getLocalDate(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(getLocalMonth(new Date()));

  const [expandedLabel, setExpandedLabel] = useState<string | null>(null);

  /* =========================
     FILTRO
  ========================= */

  const filteredSales = useMemo(() => {
    let filtered = typedSales;

    if (periodMode === "daily") {
      filtered = typedSales.filter(
        (s) => getLocalDate(s.created_at) === selectedDate
      );
    } else if (periodMode === "month") {
      filtered = typedSales.filter(
        (s) => getLocalMonth(s.created_at) === selectedMonth
      );
    } else {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - days);

      filtered = typedSales.filter((s) => new Date(s.created_at) >= limitDate);
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [typedSales, days, periodMode, selectedDate, selectedMonth]);

  /* =========================
     MÉTRICAS
  ========================= */

  const salesForMetrics: MetricsSale[] = filteredSales.map((s) => ({
    created_at: s.created_at,
    total_value: s.total_value ?? 0,
    payment_method: s.payment_method ?? undefined,
  }));

  const metrics: SalesMetrics = calculateSalesMetrics(
    salesForMetrics,
    type,
    groupBy
  );

  /* =========================
     ORDEM CORRETA (HOJE → ATRÁS)
  ========================= */

  const labelsToRender = useMemo(() => {
    if (periodMode === "daily") {
      return [formatBR(selectedDate)];
    }

    if (periodMode === "month") {
      const [year, month] = selectedMonth.split("-").map(Number);
      // Descobre o último dia do mês (ex: 28, 30 ou 31)
      const lastDay = new Date(year, month, 0).getDate();
      
      const daysArray = [];
      for (let i = 1; i <= lastDay; i++) {
        // Formata cada dia como DD/MM/AAAA
        const day = String(i).padStart(2, "0");
        const monthStr = String(month).padStart(2, "0");
        daysArray.push(`${day}/${monthStr}/${year}`);
      }
      return daysArray; // Retorna do 01 ao 31
    }

    return [...metrics.labels].reverse();
  }, [metrics.labels, periodMode, selectedDate, selectedMonth]);

  /* =========================
     PDF
  ========================= */

  const handleViewPDF = async () => {
    const pdf = await exportSalesPDF(metrics, type, groupBy);
    const blobUrl = pdf.output("bloburl");
    window.open(blobUrl);
  };

  const handleDownloadPDF = async () => {
    const pdf = await exportSalesPDF(metrics, type, groupBy);
    pdf.save("relatorio_vendas.pdf");
  };

  if (loading)
    return (
      <p className="text-sm text-muted-foreground">Carregando vendas...</p>
    );

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <CardTitle>
            Relatório de{" "}
            {type === "sales"
              ? "Vendas"
              : type === "ticket"
              ? "Ticket Médio"
              : "Receita"}
          </CardTitle>

          <div className="flex gap-2 flex-wrap items-center">
            {[30, 60, 90].map((d) => (
              <Button
                className="cursor-pointer"
                key={d}
                size="sm"
                variant={
                  periodMode === "range" && days === d ? "default" : "outline"
                }
                onClick={() => {
                  setPeriodMode("range");
                  setDays(d as 30 | 60 | 90);
                }}
              >
                {d} dias
              </Button>
            ))}

            <Button
              className="cursor-pointer"
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
              className="cursor-pointer"
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
            <Button
              className="cursor-pointer"
              size="sm"
              variant="outline"
              onClick={handleViewPDF}
            >
              <Eye className="mr-2 h-4 w-4" /> Visualizar PDF
            </Button>

            <Button
              className="cursor-pointer"
              size="sm"
              variant="default"
              onClick={handleDownloadPDF}
            >
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
            <p>R$ {formatCurrency(metrics.summary.totalRevenue)}</p>
          </div>
          <div>
            <strong>Ticket médio</strong>
            <p>{formatCurrency(metrics.summary.averageTicket)}</p>
          </div>
        </div>

        {/* TABELA */}
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
            {labelsToRender.map((label) => {
                const periodSales = filteredSales.filter((s) => {
                  const saleDateBR = formatBR(getLocalDate(s.created_at));
                  
                  // Se estivermos no modo mês ou range, comparamos o dia da venda com o label da linha
                  if (periodMode === "month" || periodMode === "range") {
                    return saleDateBR === label;
                  }

                  // Se for diário, mostra tudo daquele dia selecionado
                  if (periodMode === "daily") {
                    return getLocalDate(s.created_at) === selectedDate;
                  }

                  return saleDateBR === label;
                });

                const revenue = periodSales.reduce(
                  (sum, s) => sum + (s.total_value ?? 0),
                  0
                );

                // NOVO: Cálculo do Ticket Médio seguro para evitar erro de divisão por zero
                const averageTicket = periodSales.length > 0 ? revenue / periodSales.length : 0;

                const isOpen = expandedLabel === label;

                return (
                  <Fragment key={label}>
                    <tr
                      className="border-t cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedLabel(isOpen ? null : label)}
                    >
                      <td className="p-2">{label}</td>
                      <td className="p-2 text-right">{periodSales.length}</td>
                      <td className="p-2 text-right">
                        {formatCurrency(revenue)}
                      </td>
                      <td className="p-2 text-right">
                        {formatCurrency(averageTicket)}
                      </td>
                      </tr>

                    {isOpen &&
                      periodSales.map((sale) => (
                        <tr key={sale.id} className="bg-muted/30">
                          <td colSpan={4} className="p-3">
                            <div className="space-y-2 text-sm border-b pb-2">
                              <div className="flex justify-between font-semibold">
                                <span className="flex items-center gap-6">
                                  Venda #{sale.id.slice(0, 6)}
                                  <span className="text-muted-foreground text-xs">
                                    🕒 {formatHour(sale.created_at)}
                                  </span>
                                </span>

                                <span>
                                  Pagamento:{" "}
                                  {sale.payment_method ?? "Desconhecido"}
                                </span>

                                <span>Total: {formatCurrency(sale.total_value ?? 0)}</span>
                              </div>

                              <div className="pl-4 space-y-1">
                                {sale.items.length > 0 ? (
                                  sale.items.map((item) => (
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

                                      <span className="text-right">{formatCurrency(item.total)}</span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-muted-foreground">
                                    Venda sem itens detalhados
                                  </p>
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

        {/* GRÁFICO INVISÍVEL PARA PDF */}
        <div
          style={{
            position: "absolute",
            left: "-9999px",
            top: 0,
            width: "900px",
            height: "400px",
          }}
        >
          <SalesChart
            sales={salesForMetrics}
            type={type}
            initialGroupBy={groupBy}
            chartId="sales-chart-pdf"
          />
        </div>
      </CardContent>
    </Card>
  );
}
