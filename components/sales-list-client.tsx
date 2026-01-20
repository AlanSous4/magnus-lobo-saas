"use client";

import { useEffect, useState } from "react";
import type { Sale } from "@/types/sale";
import { useSalesRealtime } from "@/hooks/use-sales-realtime";
import { SaleCard } from "@/components/sale-card";

type Props = {
  initialSales: Sale[];
  userId: string;
};

export function SalesListClient({ initialSales, userId }: Props) {
  const [sales, setSales] = useState<Sale[]>(initialSales);

  // ✅ Hook agora apenas fornece os dados
  const { sales: realtimeSales, loading } = useSalesRealtime({ userId });

  // ✅ Sincroniza quando os dados chegam
  useEffect(() => {
    if (!loading) {
      setSales(realtimeSales);
    }
  }, [realtimeSales, loading]);

  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {sales.map((sale) => (
        <SaleCard key={sale.id} sale={sale} />
      ))}
    </div>
  );
}
