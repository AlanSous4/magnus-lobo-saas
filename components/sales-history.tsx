"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fragment } from "react";

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

  const [selectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [expandedLabel, setExpandedLabel] = useState<string | null>(null);

  /* =========================
     FILTRO CENTRAL
  ========================= */

  const filteredSales = useMemo(() => {
    if (periodMode === "daily") {
      return typedSales.filter(
        (s) =>
          new Date(s.created_at).toISOString().slice(0, 10) === selectedDate
      );
    }

    if (periodMode === "month") {
      return typedSales.filter(
        (s) =>
          new Date(s.created_at).toISOString().slice(0, 7) === selectedMonth
      );
    }

    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - days);

    return typedSales.filter(
      (s) => new Date(s.created_at) >= limitDate
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
     🔹 AGRUPA ITENS IGUAIS
  ========================= */

  function groupItems(items: SaleItem[]) {
    const map = new Map<string, SaleItem>();

    items.forEach((item) => {
      const existing = map.get(item.product_name);

      if (existing) {
        existing.quantity += item.quantity;
      } else {
        map.set(item.product_name, { ...item });
      }
    });

    return Array.from(map.values());
  }

  /* ========================= */

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">
        Carregando vendas...
      </p>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <CardTitle>Relatório de Receita</CardTitle>

          <div className="flex gap-2 flex-wrap">
            {[30, 60, 90].map((d) => (
              <Button
                key={d}
                size="sm"
                variant={
                  periodMode === "range" && days === d
                    ? "default"
                    : "outline"
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

            <Button
              size="sm"
              variant={periodMode === "month" ? "default" : "outline"}
              onClick={() => setPeriodMode("month")}
            >
              Mês
            </Button>
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
              {metrics.labels.map((label) => {
                const periodSales = filteredSales.filter(
                  (s) =>
                    new Date(s.created_at).toLocaleDateString("pt-BR") ===
                    label
                );

                const revenue = periodSales.reduce(
                  (sum, s) => sum + (s.total_value ?? 0),
                  0
                );

                const isOpen = expandedLabel === label;

                const allItems = groupItems(
                  periodSales.flatMap((s) => s.items ?? [])
                );

                return (
                  <Fragment key={label}>
                    <tr
                      className="border-t cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        setExpandedLabel(isOpen ? null : label)
                      }
                    >
                      <td className="p-2">{label}</td>
                      <td className="p-2 text-right">
                        {periodSales.length}
                      </td>
                      <td className="p-2 text-right">
                        R$ {revenue.toFixed(2)}
                      </td>
                      <td className="p-2 text-right">
                        R${" "}
                        {(revenue / (periodSales.length || 1)).toFixed(2)}
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="bg-muted/30">
                        <td colSpan={4} className="p-3">
                          <div className="space-y-1 text-sm">
                            {allItems.length > 0 ? (
                              allItems.map((item) => (
                                <div
                                  key={`${label}-${item.product_name}`}
                                  className="flex justify-between"
                                >
                                  <span>
                                    {item.product_name} ({item.quantity}x)
                                  </span>
                                  <span>
                                    R${" "}
                                    {(item.quantity * item.price).toFixed(2)}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-muted-foreground">
                                Venda sem itens detalhados
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
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