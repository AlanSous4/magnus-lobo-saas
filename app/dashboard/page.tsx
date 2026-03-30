import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, AlertCircle } from "lucide-react"
import { RecentSales } from "@/components/recent-sales"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SalesByPaymentChart } from "@/components/sales-by-payment-chart"
import { ThemeToggle } from "@/components/ThemeToggle"

// 🔹 Métricas centralizadas
import { getDashboardMetrics } from "@/lib/dashboard-metrics"
import { DashboardCards } from "@/components/dashboard-cards"

export const metadata = {
  title: "Dashboard - Magnus Lobo",
  description: "Visão geral da Padaria Lanchonete Magnus Lobo",
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // 🔹 Verifica usuário logado
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!user || error?.message?.includes("Refresh Token Not Found")) {
    redirect("/login")
  }

  // 🔹 MÉTRICAS
  const metrics = await getDashboardMetrics(user.id)

  // 🔹 PRODUTOS
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", user.id)

  // 🔹 VENDAS DO DIA
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const { data: recentSales } = await supabase
    .from("sales")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", todayStart.toISOString())
    .lte("created_at", todayEnd.toISOString())
    .order("created_at", { ascending: false })
    .limit(5)

  const lowStockProducts =
    products?.filter((p) => p.quantity < 10).length ?? 0

  const expiringSoon =
    products?.filter((p) => {
      if (!p.expiration_date) return false
      const daysUntil = Math.ceil(
        (new Date(p.expiration_date).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
      return daysUntil <= 7 && daysUntil > 0
    }).length ?? 0

  return (
    /* 🔹 Removido h-screen e overflow-hidden para evitar o scroll duplo */
    <div className="w-full min-h-full">
      <div className="pl-0 pr-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Visão geral da Padaria Lanchonete Magnus Lobo
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* 🔹 Cards de métricas */}
        <DashboardCards
          productsCount={metrics.productsCount}
          salesCount={metrics.salesCount}
          revenue={metrics.revenue}
          averageTicket={metrics.averageTicket}
        />

        {/* 🔹 ALERTA ESTOQUE */}
        {lowStockProducts > 0 && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-500/10 dark:border-orange-500/20">
            <CardContent className="pt-4">
              <p className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {lowStockProducts} produto(s) com estoque baixo
              </p>
            </CardContent>
          </Card>
        )}

        {/* 🔹 ALERTA VALIDADE */}
        {expiringSoon > 0 && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-500/10 dark:border-orange-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium dark:text-orange-400">
                <AlertCircle className="h-5 w-5 text-orange-600 shrink-0" />
                Atenção: Produtos com validade próxima
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {expiringSoon} produto(s) vencendo nos próximos 7 dias.
                <Link
                  href="/produtos"
                  className="ml-2 font-medium text-orange-600 hover:underline dark:text-orange-400"
                >
                  Ver produtos
                </Link>
              </p>
            </CardContent>
          </Card>
        )}

        {/* 🔹 GRID INFERIOR */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {/* Vendas Recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">
                Vendas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentSales sales={recentSales || []} />
            </CardContent>
          </Card>

          {/* 📊 GRÁFICO PAGAMENTOS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">
                Formas de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SalesByPaymentChart />
            </CardContent>
          </Card>

          {/* Ações rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start" size="lg">
                <Link href="/vendas">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Nova Venda
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full justify-start bg-transparent"
                size="lg"
              >
                <Link href="/produtos">
                  <Package className="mr-2 h-5 w-5" />
                  Gerenciar Produtos
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}