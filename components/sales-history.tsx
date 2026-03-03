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

/* =========================
   🔹 TIPOS CORRETOS
========================= */

type SaleItem = {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
};

type SaleWithItems = {
  id: string;
  created_at: string;
  total_value?: number | null;
  items?: SaleItem[];
  payment_method?: string | null;
};

export type SalesHistoryProps = {
  type: "sales" | "revenue" | "ticket";
  groupBy: "day" | "month";
  userId: string;
};

type PeriodMode = "range" | "daily" | "month";

/* =========================
   COMPONENTE
========================= */

export function SalesHistory({ type, groupBy, userId }: SalesHistoryProps) {
  const { sales, loading } = useSalesRealtime({ userId });
  const typedSales = sales as SaleWithItems[];

  const [days, setDays] = useState<30 | 60 | 90>(30);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("range");

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [expandedLabel, setExpandedLabel] = useState<string | null>(null);

  /* =========================
     FILTRO CENTRAL
  ========================== */

  const filteredSales = useMemo(() => {
    let filtered = typedSales;

    if (periodMode === "daily") {
      filtered = typedSales.filter(
        (s) =>
          new Date(s.created_at).toISOString().slice(0, 10) === selectedDate
      );
    } else if (periodMode === "month") {
      filtered = typedSales.filter(
        (s) =>
          new Date(s.created_at).toISOString().slice(0, 7) === selectedMonth
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

  const salesForMetrics: MetricsSale[] = filteredSales.map((s) => ({
    id: s.id,
    total_amount: s.total_value ?? 0,
    created_at: s.created_at,
  }));

  const metrics: SalesMetrics = calculateSalesMetrics(
    salesForMetrics,
    "revenue",
    groupBy
  );

  /* =========================
     🔹 MAPA DE FORMAS DE PAGAMENTO
  ========================== */

  const paymentLabelMap: Record<string, string> = {
    cash: "Dinheiro",
    card: "Cartão",
    pix: "PIX",
    vr: "Vale Refeição",
    va: "Vale Alimentação",
  };

  /* =========================
     🔹 LABELS PARA A TABELA
  ========================== */

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

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Carregando vendas...</p>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <CardTitle>Relatório de Receita</CardTitle>

          <div className="flex gap-2 flex-wrap items-center">
            {[30, 60, 90].map((d) => (
              <Button
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
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
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
                  if (periodMode === "daily")
                    return (
                      new Date(s.created_at).toISOString().slice(0, 10) ===
                      selectedDate
                    );
                  if (periodMode === "month")
                    return (
                      new Date(s.created_at).toISOString().slice(0, 7) ===
                      selectedMonth
                    );
                  return (
                    new Date(s.created_at).toLocaleDateString("pt-BR") === label
                  );
                });

                const revenue = periodSales.reduce(
                  (sum, s) => sum + (s.total_value ?? 0),
                  0
                );
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
                        R$ {revenue.toFixed(2)}
                      </td>
                      <td className="p-2 text-right">
                        R$ {(revenue / (periodSales.length || 1)).toFixed(2)}
                      </td>
                    </tr>

                    {isOpen &&
                      periodSales.map((sale) => (
                        <tr key={`expanded-${sale.id}`} className="bg-muted/30">
                          <td colSpan={4} className="p-3">
                            <div className="space-y-2 text-sm border-b pb-2">
                              <div className="flex justify-between font-semibold">
                                <span>Venda: {sale.id}</span>
                                <span>
                                  Pagamento:{" "}
                                  {paymentLabelMap[sale.payment_method ?? ""] ??
                                    sale.payment_method ??
                                    "Desconhecido"}
                                </span>
                                <span>
                                  Total: R$ {(sale.total_value ?? 0).toFixed(2)}
                                </span>
                              </div>

                              {/* Lista de itens com hover laranja apenas na linha expandida */}
                              <div className="pl-4 space-y-1">
                                {sale.items && sale.items.length > 0 ? (
                                  sale.items.map((item) => (
                                    <div
                                      key={`${sale.id}-${item.id}`}
                                      className="grid grid-cols-3 items-center px-2 py-1 rounded hover:bg-[rgb(255,237,212)]"
                                    >
                                      {/* Produto alinhado à esquerda */}
                                      <span className="text-left">
                                        {item.product_name}
                                      </span>

                                      {/* Quantidade centralizada (referência à coluna "Vendas") */}
                                      <span className="text-center -translate-x-5 inline-block">
                                        ({item.quantity}.UN)
                                      </span>

                                      {/* Preço alinhado à direita */}
                                      <span className="text-right">
                                        R${" "}
                                        {(item.price * item.quantity).toFixed(
                                          2
                                        )}
                                      </span>
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
      </CardContent>
    </Card>
  );
}
