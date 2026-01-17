"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useState } from "react"
import { Button } from "@/components/ui/button"

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

  const groupedData = sales.reduce<Record<string, number>>((acc, sale) => {
    const date = new Date(sale.created_at)

    const key =
      groupBy === "day"
        ? date.toLocaleDateString("pt-BR")
        : `${date.getMonth() + 1}/${date.getFullYear()}`

    if (type === "sales") {
      acc[key] = (acc[key] || 0) + 1
    } else if (type === "ticket") {
      acc[key] = (acc[key] || 0) + Number(sale.total_amount)
    } else {
      acc[key] = (acc[key] || 0) + Number(sale.total_amount)
    }

    return acc
  }, {})

  const chartData = Object.entries(groupedData).map(
    ([date, total]) => ({
      date,
      total:
        type === "ticket"
          ? total /
            sales.filter(
              (s) =>
                new Date(s.created_at).toLocaleDateString("pt-BR") === date
            ).length
          : total,
    })
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
              dataKey="total"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
