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
  estoqueCritico,
  diasParaVencer,
  onImageUpdate,
}: Props) {

  const safeExpiration = parseSafeDate(product.expiration_date);

  const isLowStock = product.quantity <= estoqueCritico;

  const isExpired =
    safeExpiration &&
    safeExpiration.getTime() < Date.now();

  const isExpiringSoon =
    safeExpiration &&
    !isExpired &&
    (safeExpiration.getTime() - Date.now()) /
      (1000 * 60 * 60 * 24) <=
      diasParaVencer;

  return (
    <Card
      className={`relative border-2 ${
        isExpired
          ? "border-red-500 bg-red-50"
          : isExpiringSoon
          ? "border-yellow-400 bg-yellow-50"
          : isLowStock
          ? "border-orange-400 bg-orange-50"
          : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div>
            <h3 className="font-semibold text-lg">{product.name}</h3>
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
            className="w-full h-40 object-contain rounded bg-white"
          />
        ) : (
          <div className="w-full h-40 bg-gray-200 rounded flex items-center justify-center text-gray-500">
            Sem foto
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4" />
          Quantidade:
          <Badge variant={isLowStock ? "destructive" : "default"}>
            {product.quantity}
          </Badge>
        </div>

        {safeExpiration && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            Validade:
            <Badge
              variant={
                isExpired
                  ? "destructive"
                  : isExpiringSoon
                  ? "secondary"
                  : "outline"
              }
            >
              {safeExpiration.toLocaleDateString("pt-BR")}
              {isExpired && <AlertCircle className="ml-1 h-3 w-3" />}
            </Badge>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          Adicionado{" "}
          {formatDistanceToNow(new Date(product.created_at), {
            addSuffix: true,
            locale: ptBR,
          })}
        </div>

        <TestUploadButton
          productId={product.id}
          onUploadSuccess={(url) => onImageUpdate(product.id, url)}
        />
      </CardContent>
    </Card>
  );
}

/**
 * 🔥 memo impede rerender se o product não mudou
 */
export const ProductCard = memo(ProductCardComponent);