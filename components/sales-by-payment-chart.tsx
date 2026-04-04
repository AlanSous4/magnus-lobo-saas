"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import type { Sale } from "@/types/sale"

interface SalesByPaymentChartProps {
  userId: string
  sales: Sale[]         // Recebe as vendas já filtradas do Dashboard
  loading: boolean      // Recebe o estado de loading do Dashboard
  period: number        // Período atual para os botões ficarem azuis
  setPeriod: (p: number) => void // Função para mudar o período global
}

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

const labels: Record<string, string> = {
  pix: "Pix",
  credit: "Crédito",
  credito: "Crédito",
  debit: "Débito",
  debito: "Débito",
  cash: "Dinheiro",
  dinheiro: "Dinheiro",
  vr: "VR",
  va: "VA",
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function SalesByPaymentChart({ sales, loading, period, setPeriod }: SalesByPaymentChartProps) {
  
  const chartData = useMemo(() => {
    const totals: Record<string, number> = {};
    sales.forEach((sale) => {
      const rawMethod = sale.payment_method?.toLowerCase() || "outro";
      const label = labels[rawMethod] || rawMethod.charAt(0).toUpperCase() + rawMethod.slice(1);
      const value = typeof sale.total_value === 'number' ? sale.total_value : Number(sale.total_value || 0);
      totals[label] = (totals[label] || 0) + value;
    });

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [sales]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Vendas por forma de pagamento</CardTitle>
        <div className="flex gap-2 flex-wrap">
          {[1, 7, 30, 90].map((d) => (
            <Button
              key={d}
              size="sm"
              variant={period === d ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setPeriod(d)}
            >
              {d === 1 ? "Hoje" : `${d} dias`}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="h-70 sm:h-80">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Carregando gráfico...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Nenhuma venda encontrada
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
                label={false} 
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="outline-none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}