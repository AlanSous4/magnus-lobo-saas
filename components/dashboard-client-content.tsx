"use client"

import { useState, useMemo } from "react"
import { useSalesRealtime } from "@/hooks/use-sales-realtime"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, AlertCircle } from "lucide-react"
import { RecentSales } from "@/components/recent-sales"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SalesByPaymentChart } from "@/components/sales-by-payment-chart"
import { ThemeToggle } from "@/components/ThemeToggle"
import { DashboardCards } from "@/components/dashboard-cards"

function getLocalDate(dateInput?: any) {
  const d = dateInput ? new Date(dateInput) : new Date();
  return d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

interface DashboardContentProps {
  userId: string;
  initialProducts: any[];
  initialRecentSales: any[];
}

export function DashboardClientContent({ userId, initialProducts, initialRecentSales }: DashboardContentProps) {
  const [period, setPeriod] = useState<number>(1);

  const dateRange = useMemo(() => {
    const todayStr = getLocalDate();
    if (period === 1) return { start: todayStr, end: todayStr };
    const start = new Date();
    start.setDate(start.getDate() - (period - 1));
    return { start: getLocalDate(start), end: todayStr };
  }, [period]);

  const { sales, loading } = useSalesRealtime({
    userId,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const metrics = useMemo(() => {
    const targetDate = getLocalDate();
    const filtered = period === 1 
      ? sales.filter(s => getLocalDate(s.created_at) === targetDate)
      : sales;

    const revenue = filtered.reduce((acc, s) => acc + Number(s.total_value || 0), 0);
    const salesCount = filtered.length;
    const averageTicket = salesCount > 0 ? revenue / salesCount : 0;

    return { revenue, salesCount, averageTicket, filtered };
  }, [sales, period]);

  const lowStockProducts = initialProducts?.filter((p) => p.quantity < 10).length ?? 0;
  const expiringSoon = initialProducts?.filter((p) => {
    if (!p.expiration_date) return false;
    const daysUntil = Math.ceil((new Date(p.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7 && daysUntil > 0;
  }).length ?? 0;

  return (
    <div className="w-full min-h-full">
      <div className="pl-0 pr-4 space-y-4 pb-8">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Visão geral da Padaria Lanchonete Magnus Lobo</p>
          </div>
          <ThemeToggle />
        </div>

        {/* 🔹 Cards que agora mudam junto com o gráfico */}
        <DashboardCards
          productsCount={initialProducts?.length || 0}
          salesCount={metrics.salesCount}
          revenue={metrics.revenue}
          averageTicket={metrics.averageTicket}
        />

        {lowStockProducts > 0 && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-500/10">
            <CardContent className="pt-4 flex items-center gap-2 text-sm text-orange-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {lowStockProducts} produto(s) com estoque baixo
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-base sm:text-lg">Vendas Recentes</CardTitle></CardHeader>
            <CardContent><RecentSales sales={initialRecentSales || []} /></CardContent>
          </Card>

          {/* 📊 Gráfico passando as funções de controle para o Dash */}
          <SalesByPaymentChart 
            userId={userId} 
            sales={metrics.filtered} 
            loading={loading}
            period={period}
            setPeriod={setPeriod}
          />

          <Card>
            <CardHeader><CardTitle className="text-base sm:text-lg">Ações Rápidas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start" size="lg">
                <Link href="/vendas"><ShoppingCart className="mr-2 h-5 w-5" /> Nova Venda</Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start" size="lg">
                <Link href="/produtos"><Package className="mr-2 h-5 w-5" /> Gerenciar Produtos</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}