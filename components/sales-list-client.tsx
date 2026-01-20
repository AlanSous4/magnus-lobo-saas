"use client";

import { useState } from "react";
import type { Sale } from "@/types/sale"; // ✅ mesmo tipo usado no hook
import { useSalesRealtime } from "@/hooks/use-sales-realtime";
import { SaleCard } from "@/components/sale-card";

type Props = {
  initialSales: Sale[];
  userId: string;
};

export function SalesListClient({ initialSales, userId }: Props) {
  const [sales, setSales] = useState<Sale[]>(initialSales);

  // 🔹 Hook Realtime agora com tipos corretos
  useSalesRealtime({
    userId,
    onInsert: (sale) => setSales((prev) => [sale, ...prev]),
    onUpdate: (updated) =>
      setSales((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      ),
    onDelete: (id) => setSales((prev) => prev.filter((s) => s.id !== id)),
  });

  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {sales.map((sale) => (
        <SaleCard key={sale.id} sale={sale} />
      ))}
    </div>
  );
}
