"use client";

import { Product } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EditProductDialog } from "@/components/edit-product-dialog";
import { DeleteProductButton } from "@/components/delete-product-button";
import TestUploadButton from "@/components/test-upload-button";
import { Package, Calendar, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { memo } from "react";

type Props = {
  product: Product;
  isLowStock: boolean; // Recebe a lógica calculada do ProductList
  estoqueCritico: number;
  diasParaVencer: number;
  onImageUpdate: (id: string, url: string) => void;
};

/* 🔧 Corrige timezone de datas */
function parseSafeDate(date: string | null) {
  if (!date) return null;
  return new Date(date + "T12:00:00");
}

function ProductCardComponent({
  product,
  isLowStock,
  diasParaVencer,
  onImageUpdate,
}: Props) {
  const safeExpiration = parseSafeDate(product.expiration_date);

  // Lógica de Vencimento
  const isExpired =
    safeExpiration && safeExpiration.getTime() < Date.now();

  const isExpiringSoon =
    safeExpiration &&
    !isExpired &&
    (safeExpiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24) <=
      diasParaVencer;

  return (
    <Card
      className={`relative border-2 transition-colors ${
        isExpired
          ? "border-red-500 bg-red-50"
          : isExpiringSoon
          ? "border-yellow-400 bg-yellow-50"
          : isLowStock
          ? "border-orange-400 bg-orange-50"
          : "hover:border-slate-300"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg leading-none">{product.name}</h3>
            <p className="text-orange-600 font-bold">
              R$ {product.value.toFixed(2)}
            </p>
          </div>
          <div className="flex gap-1">
            <EditProductDialog product={product} />
            <DeleteProductButton productId={product.id} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-40 object-contain rounded bg-white border"
          />
        ) : (
          <div className="w-full h-40 bg-gray-100 rounded flex items-center justify-center text-gray-400 border border-dashed">
            <Package className="h-8 w-8 opacity-20" />
          </div>
        )}

        {/* Campo de Quantidade com Badge Dinâmico */}
        <div className="flex items-center gap-2 text-sm font-medium">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span>Quantidade:</span>
          <Badge variant={isLowStock ? "destructive" : "secondary"}>
            {product.is_weight ? `${product.quantity.toFixed(3)} kg` : product.quantity}
          </Badge>
        </div>

        {/* Campo de Validade */}
        {safeExpiration && (
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Validade:</span>
            <Badge
              variant={
                isExpired
                  ? "destructive"
                  : isExpiringSoon
                  ? "secondary"
                  : "outline"
              }
              className="gap-1"
            >
              {safeExpiration.toLocaleDateString("pt-BR")}
              {isExpired && <AlertCircle className="h-3 w-3" />}
            </Badge>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t">
          Adicionado{" "}
          {formatDistanceToNow(new Date(product.created_at), {
            addSuffix: true,
            locale: ptBR,
          })}
        </div>

        <div className="pt-1">
          <TestUploadButton
            productId={product.id}
            onUploadSuccess={(url) => onImageUpdate(product.id, url)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export const ProductCard = memo(ProductCardComponent);