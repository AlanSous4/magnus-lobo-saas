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
  return (
    <Card className="border">
      <CardContent className="space-y-3 pt-4">
        {sale.image_url ? (
          <img
            src={sale.image_url}
            alt={sale.product_name}
            className="w-full h-36 object-contain bg-white rounded"
          />
        ) : (
          <div className="w-full h-36 bg-gray-200 rounded flex items-center justify-center text-gray-500">
            Sem imagem
          </div>
        )}

        <div className="font-semibold">{sale.product_name}</div>

        <div className="flex justify-between text-sm">
          <Badge>Qtd: {sale.quantity}</Badge>
          <span className="font-bold text-green-600">
            {sale.total_value !== null
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
