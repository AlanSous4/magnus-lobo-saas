"use client";

import { memo } from "react";
import { Sale } from "@/types/sale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Props = {
  sale: Sale;
};

export const SaleCard = memo(function SaleCard({ sale }: Props) {
  const imageUrl = (sale as any).image_url;
  const productName = (sale as any).product_name ?? "Produto";
  const quantity = (sale as any).quantity ?? 0;

  return (
    <Card className="border">
      <CardContent className="space-y-3 pt-4">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={productName}
            className="w-full h-36 object-contain bg-white rounded"
          />
        ) : (
          <div className="w-full h-36 bg-gray-200 rounded flex items-center justify-center text-gray-500">
            Sem imagem
          </div>
        )}

        <div className="font-semibold">{productName}</div>

        <div className="flex justify-between text-sm">
          <Badge>Qtd: {quantity}</Badge>

          <span className="font-bold text-green-600">
            {sale.total_value !== null && sale.total_value !== undefined
              ? `R$ ${sale.total_value.toFixed(2)}`
              : "Valor não informado"}
          </span>
        </div>

        <div className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(sale.created_at), {
            addSuffix: true,
            locale: ptBR,
          })}
        </div>
      </CardContent>
    </Card>
  );
});