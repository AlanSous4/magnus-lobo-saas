"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Package, Calendar, TrendingUp, AlertCircle } from "lucide-react"
import { EditProductDialog } from "@/components/edit-product-dialog"
import { DeleteProductButton } from "@/components/delete-product-button"

interface Product {
  id: string
  name: string
  value: number
  quantity: number
  expiration_date: string | null
  entry_date: string
  exit_date: string | null
  created_at: string
}

interface ProductListProps {
  products: Product[]
}

export function ProductList({ products }: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhum produto cadastrado</h3>
        <p className="text-sm text-muted-foreground">Adicione seu primeiro produto usando o botão acima</p>
      </div>
    )
  }

  const isExpiringSoon = (expirationDate: string | null) => {
    if (!expirationDate) return false
    const daysUntilExpiration = Math.ceil(
      (new Date(expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    )
    return daysUntilExpiration <= 7 && daysUntilExpiration > 0
  }

  const isExpired = (expirationDate: string | null) => {
    if (!expirationDate) return false
    return new Date(expirationDate) < new Date()
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <Card key={product.id} className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-semibold text-lg leading-tight">{product.name}</h3>
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
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Quantidade:</span>
              <Badge variant={product.quantity > 0 ? "default" : "destructive"}>{product.quantity}</Badge>
            </div>

            {product.expiration_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Validade:</span>
                <Badge
                  variant={
                    isExpired(product.expiration_date)
                      ? "destructive"
                      : isExpiringSoon(product.expiration_date)
                        ? "secondary"
                        : "outline"
                  }
                >
                  {new Date(product.expiration_date).toLocaleDateString("pt-BR")}
                  {isExpired(product.expiration_date) && <AlertCircle className="ml-1 h-3 w-3" />}
                </Badge>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Adicionado {formatDistanceToNow(new Date(product.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
