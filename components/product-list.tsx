"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Package,
  Calendar,
  TrendingUp,
  AlertCircle,
} from "lucide-react"
import { EditProductDialog } from "@/components/edit-product-dialog"
import { DeleteProductButton } from "@/components/delete-product-button"
import clsx from "clsx"

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

export function ProductList({
  products,
  estoqueCritico,
  diasParaVencer,
}: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          Nenhum produto cadastrado
        </h3>
        <p className="text-sm text-muted-foreground">
          Adicione seu primeiro produto usando o botão acima
        </p>
      </div>
    )
  }

  const isExpired = (date: string | null) =>
    date ? new Date(date) < new Date() : false

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false
    const diffDays =
      (new Date(date).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)

    return diffDays <= diasParaVencer && diffDays > 0
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => {
        const expired = isExpired(product.expiration_date)
        const expiringSoon = isExpiringSoon(product.expiration_date)
        const lowStock = product.quantity <= estoqueCritico

        return (
          <Card
            key={product.id}
            className={clsx(
              "relative transition border-l-4",
              expired &&
                "border-l-red-600 bg-red-50/60",
              !expired &&
                expiringSoon &&
                "border-l-red-400 bg-red-50/40",
              !expired &&
                !expiringSoon &&
                lowStock &&
                "border-l-orange-400 bg-orange-50/40"
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg leading-tight">
                    {product.name}
                  </h3>
                  <p className="text-2xl font-bold text-orange-600 mt-1">
                    R$ {product.value.toFixed(2).replace(".", ",")}
                  </p>
                </div>

                <div className="flex gap-1">
                  <EditProductDialog product={product} />
                  <DeleteProductButton productId={product.id} />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Quantidade */}
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Quantidade:
                </span>
                <Badge
                  variant={
                    lowStock ? "destructive" : "default"
                  }
                >
                  {product.quantity}
                </Badge>
              </div>

              {/* Validade */}
              {product.expiration_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Validade:
                  </span>

                  <Badge
                    variant={
                      expired
                        ? "destructive"
                        : expiringSoon
                        ? "secondary"
                        : "outline"
                    }
                    className="flex items-center gap-1"
                  >
                    {new Date(
                      product.expiration_date
                    ).toLocaleDateString("pt-BR")}

                    {(expired || expiringSoon) && (
                      <AlertCircle className="h-3 w-3" />
                    )}
                  </Badge>
                </div>
              )}

              {/* Criado */}
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Adicionado{" "}
                  {formatDistanceToNow(
                    new Date(product.created_at),
                    {
                      addSuffix: true,
                      locale: ptBR,
                    }
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
