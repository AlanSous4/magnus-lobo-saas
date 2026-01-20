"use client";

import { calculateSalesMetrics, Sale as MetricsSale, ChartType, GroupBy } from "@/lib/sales-metrics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";

type Props = {
  sales: MetricsSale[];
  type: ChartType;
  initialGroupBy?: GroupBy;
};

export function SalesChart({ sales, type, initialGroupBy = "day" }: Props) {
  const [groupBy, setGroupBy] = useState<GroupBy>(initialGroupBy);
  const chartRef = useRef<HTMLDivElement>(null);

  const { chartData } = calculateSalesMetrics(sales, type, groupBy);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={groupBy === "day" ? "default" : "outline"} onClick={() => setGroupBy("day")}>
          Diário
        </Button>
        <Button variant={groupBy === "month" ? "default" : "outline"} onClick={() => setGroupBy("month")}>
          Mensal
        </Button>
      </div>

      <div ref={chartRef} id="sales-chart" className="h-72 w-full bg-white">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" strokeWidth={2} stroke="#2563eb" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
