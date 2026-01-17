import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, AlertCircle } from "lucide-react"
import { RecentSales } from "@/components/recent-sales"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// 🔹 Métricas centralizadas
import { getDashboardMetrics } from "@/lib/dashboard-metrics"
import { DashboardCards } from "@/components/dashboard-cards"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // 🔹 MÉTRICAS DO DASHBOARD
  const metrics = await getDashboardMetrics(user.id)

  // 🔹 DADOS AUXILIARES
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", user.id)

  const { data: recentSales } = await supabase
    .from("sales")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5)

  const totalStock =
    products?.reduce((sum, p) => sum + p.quantity, 0) ?? 0

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
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral da Padaria Magnus Lobo
        </p>
      </div>

      {/* 🔹 Cards clicáveis */}
      <DashboardCards
        productsCount={metrics.productsCount}
        salesCount={metrics.salesCount}
        revenue={metrics.revenue}
        averageTicket={metrics.averageTicket}
      />

      {/* 🔹 ALERTA: ESTOQUE BAIXO */}
      {lowStockProducts > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <p className="text-sm text-orange-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {lowStockProducts} produto(s) com estoque baixo
            </p>
          </CardContent>
        </Card>
      )}

      {/* 🔹 ALERTA: VALIDADE PRÓXIMA */}
      {expiringSoon > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Atenção: Produtos com validade próxima
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {expiringSoon} produto(s) vencendo nos próximos 7 dias.
              <Link
                href="/produtos"
                className="ml-2 text-orange-600 hover:underline font-medium"
              >
                Ver produtos
              </Link>
            </p>
          </CardContent>
        </Card>
      )}

      {/* 🔹 GRID INFERIOR */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vendas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentSales sales={recentSales || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
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
  )
}
