import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, DollarSign, TrendingUp, AlertCircle } from "lucide-react"
import { RecentSales } from "@/components/recent-sales"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Buscar estatísticas
  const { data: products } = await supabase.from("products").select("*").eq("user_id", user.id)

  const { data: sales } = await supabase
    .from("sales")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const { data: recentSales } = await supabase
    .from("sales")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5)

  const totalProducts = products?.length || 0
  const totalStock = products?.reduce((sum, p) => sum + p.quantity, 0) || 0
  const totalSales = sales?.length || 0
  const totalRevenue = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0

  const lowStockProducts = products?.filter((p) => p.quantity < 10).length || 0
  const expiringSoon =
    products?.filter((p) => {
      if (!p.expiration_date) return false
      const daysUntil = Math.ceil((new Date(p.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return daysUntil <= 7 && daysUntil > 0
    }).length || 0

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da Padaria Magnus Lobo</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Cadastrados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {totalStock} unidades em estoque
              {lowStockProducts > 0 && (
                <span className="block text-orange-600 mt-1">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  {lowStockProducts} com estoque baixo
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas (30 dias)</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
            <p className="text-xs text-muted-foreground">Total de vendas realizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita (30 dias)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Faturamento no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalSales > 0 ? (totalRevenue / totalSales).toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Valor médio por venda</p>
          </CardContent>
        </Card>
      </div>

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
              <Link href="/produtos" className="ml-2 text-orange-600 hover:underline font-medium">
                Ver produtos
              </Link>
            </p>
          </CardContent>
        </Card>
      )}

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
            <Button asChild variant="outline" className="w-full justify-start bg-transparent" size="lg">
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
