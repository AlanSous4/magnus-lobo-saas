"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Package,
  Calendar,
  TrendingUp,
  AlertCircle,
  Filter,
} from "lucide-react"
import { EditProductDialog } from "@/components/edit-product-dialog"
import { DeleteProductButton } from "@/components/delete-product-button"

interface Product {
  id: string
  name: string
  value: number
  quantity: number
  expiration_date: string | null
  created_at: string
}

interface ProductListProps {
  products: Product[]
  estoqueCritico: number
  diasParaVencer: number
}


type ProductFilter =
  | "all"
  | "low-stock"
  | "expiring-soon"
  | "expired"

export function ProductList({ products }: ProductListProps) {
  const [filter, setFilter] = useState<ProductFilter>("all")

  /* =========================
     🔹 Regras
     ========================= */
  const isLowStock = (qtd: number) => qtd <= 5

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false
    const diff =
      (new Date(date).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24)
    return diff > 0 && diff <= 7
  }

  const isExpired = (date: string | null) => {
    if (!date) return false
    return new Date(date) < new Date()
  }

  /* =========================
     🔹 Aplicar filtro
     ========================= */
  const filteredProducts = products.filter((product) => {
    if (filter === "low-stock")
      return isLowStock(product.quantity)

    if (filter === "expiring-soon")
      return isExpiringSoon(product.expiration_date)

    if (filter === "expired")
      return isExpired(product.expiration_date)

    return true
  })

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          Nenhum produto cadastrado
        </h3>
      </div>
    )
  }

  return (
    <>
      {/* =========================
          🔘 BOTÕES DE FILTRO
          ========================= */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          <Filter className="h-4 w-4 mr-2" />
          Todos
        </Button>

        <Button
          variant={filter === "low-stock" ? "default" : "outline"}
          onClick={() => setFilter("low-stock")}
        >
          ⚠️ Estoque baixo
        </Button>

        <Button
          variant={
            filter === "expiring-soon" ? "default" : "outline"
          }
          onClick={() => setFilter("expiring-soon")}
        >
          ⏳ Próx. vencimento
        </Button>

        <Button
          variant={filter === "expired" ? "destructive" : "outline"}
          onClick={() => setFilter("expired")}
        >
          ❌ Vencidos
        </Button>
      </div>

      {/* =========================
          🧱 LISTA DE CARDS
          ========================= */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => {
          const expired = isExpired(product.expiration_date)
          const expiringSoon = isExpiringSoon(
            product.expiration_date
          )
          const lowStock = isLowStock(product.quantity)

          return (
            <Card
              key={product.id}
              className={`relative border-2 ${
                expired
                  ? "border-red-500 bg-red-50"
                  : expiringSoon
                  ? "border-yellow-400 bg-yellow-50"
                  : lowStock
                  ? "border-orange-400 bg-orange-50"
                  : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {product.name}
                    </h3>
                    <p className="text-orange-600 font-bold">
                      R$ {product.value.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <EditProductDialog product={product} />
                    <DeleteProductButton
                      productId={product.id}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4" />
                  Quantidade:
                  <Badge
                    variant={
                      lowStock ? "destructive" : "default"
                    }
                  >
                    {product.quantity}
                  </Badge>
                </div>

                {product.expiration_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    Validade:
                    <Badge
                      variant={
                        expired
                          ? "destructive"
                          : expiringSoon
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {new Date(
                        product.expiration_date
                      ).toLocaleDateString("pt-BR")}
                      {expired && (
                        <AlertCircle className="ml-1 h-3 w-3" />
                      )}
                    </Badge>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  Adicionado{" "}
                  {formatDistanceToNow(
                    new Date(product.created_at),
                    { addSuffix: true, locale: ptBR }
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}
