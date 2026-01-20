"use client";

import {
  calculateSalesMetrics,
  Sale as MetricsSale,
  ChartType,
  GroupBy,
} from "@/lib/sales-metrics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type Props = {
  sales: MetricsSale[];
  type: ChartType;
  initialGroupBy?: GroupBy;
  chartId?: string; // 👈 permite reutilizar
};

export function SalesChart({
  sales,
  type,
  initialGroupBy = "day",
  chartId = "sales-chart",
}: Props) {
  const [groupBy, setGroupBy] = useState<GroupBy>(initialGroupBy);

  const { chartData } = calculateSalesMetrics(sales, type, groupBy);

  return (
    <div className="space-y-4">
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

      {/* 🔹 ID fixo e garantido */}
      <div id={chartId} className="h-72 w-full bg-white">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
