"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SalesChart } from "@/components/sales-chart"
import { Button } from "@/components/ui/button"
import { exportSalesPDF } from "@/components/pdf-export"
import { calculateSalesMetrics, SalesMetrics } from "@/lib/sales-metrics"

export type Sale = {
  id: string
  total_amount: number
  created_at: string
}

export type SalesHistoryProps = {
  sales: Sale[]
  type: "sales" | "revenue" | "ticket"
  groupBy: "day" | "month"
}

export function SalesHistory({ sales, type, groupBy }: SalesHistoryProps) {
  // 🔹 MÉTRICAS ÚNICAS (gráfico + PDF)
  const metrics: SalesMetrics = calculateSalesMetrics(sales, type, groupBy)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          {type === "sales"
            ? "Quantidade de Vendas"
            : type === "ticket"
            ? "Ticket Médio"
            : "Receita por Período"}
        </CardTitle>

        {/* 🔹 PDF */}
        <Button
          variant="outline"
          onClick={() => exportSalesPDF(metrics, type, groupBy)}
        >
          Exportar PDF
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 🔹 Gráfico */}
        <SalesChart sales={sales} type={type} />

        {/* 🔹 Lista detalhada */}
        <div className="space-y-2">
          {sales.map((sale) => (
            <div key={sale.id} className="flex justify-between text-sm">
              <span>
                {new Date(sale.created_at).toLocaleDateString("pt-BR")}
              </span>

              <span className="font-medium">
                {type === "sales"
                  ? "1 venda"
                  : `R$ ${Number(sale.total_amount).toFixed(2)}`}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
