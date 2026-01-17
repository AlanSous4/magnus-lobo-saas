"use client"

import { calculateSalesMetrics } from "@/lib/sales-metrics"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Button } from "@/components/ui/button"
import { useState } from "react"

type Sale = {
  created_at: string
  total_amount: number
}

type ChartType = "sales" | "revenue" | "ticket"
type GroupBy = "day" | "month"

type Props = {
  sales: Sale[]
  type: ChartType
}

export function SalesChart({ sales, type }: Props) {
  const [groupBy, setGroupBy] = useState<GroupBy>("day")

  const { chartData } = calculateSalesMetrics(
    sales,
    type,
    groupBy
  )

  return (
    <div className="space-y-4">
      {/* 🔹 Seletor */}
      <div className="flex gap-2">
        <Button
          variant={groupBy === "day" ? "default" : "outline"}
          onClick={() => setGroupBy("day")}
        >
          Diário
        </Button>

        <Button
          variant={groupBy === "month" ? "default" : "outline"}
          onClick={() => setGroupBy("month")}
        >
          Mensal
        </Button>
      </div>

      {/* 🔹 Gráfico */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
