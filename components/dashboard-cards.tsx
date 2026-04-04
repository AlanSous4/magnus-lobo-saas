import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, DollarSign, TrendingUp } from "lucide-react"

interface DashboardCardsProps {
  productsCount: number
  salesCount: number
  revenue: number
  averageTicket: number
}

/* --------------------------------------------------
 * Função Utilitária de Formatação
 * -------------------------------------------------- */
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function DashboardCards({
  productsCount,
  salesCount,
  revenue,
  averageTicket,
}: DashboardCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      
      {/* Produtos */}
      <Link href="/produtos" className="group">
        <Card className="cursor-pointer transition-shadow lg:hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Produtos Cadastrados
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground lg:group-hover:text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productsCount}</div>
          </CardContent>
        </Card>
      </Link>

      {/* Vendas */}
      <Link href="/vendas/relatorio?type=sales" className="group">
        <Card className="cursor-pointer transition-shadow lg:hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Vendas 
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground lg:group-hover:text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesCount}</div>
          </CardContent>
        </Card>
      </Link>

      {/* Receita */}
      <Link href="/vendas/relatorio?type=revenue" className="group">
        <Card className="cursor-pointer transition-shadow lg:hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Receita 
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground lg:group-hover:text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(revenue)}
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Ticket Médio */}
      <Link href="/vendas/relatorio?type=ticket" className="group">
        <Card className="cursor-pointer transition-shadow lg:hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Ticket Médio
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground lg:group-hover:text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(averageTicket)}
            </div>
          </CardContent>
        </Card>
      </Link>

    </div>
  )
}