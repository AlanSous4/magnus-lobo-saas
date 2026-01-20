"use client";

import { SalesHistory } from "@/components/sales-history";

export default function RelatorioVendasPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Relatório de Vendas</h1>

      <SalesHistory
        type="sales"
        groupBy="day"
        userId="current"
      />
    </div>
  );
}
