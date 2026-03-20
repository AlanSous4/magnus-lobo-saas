import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Sale {
  id: string
  total_amount: number
  payment_method: string
  created_at: string
}

interface RecentSalesProps {
  sales: Sale[]
}

const paymentMethodLabels: Record<string, string> = {
  credit: "Crédito",
  debit: "Débito",
  vr: "VR",
  va: "VA",
  cash: "Dinheiro",
  pix: "Pix",
}

/* --------------------------------------------------
 * Função Utilitária de Formatação BRL
 * -------------------------------------------------- */
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function RecentSales({ sales }: RecentSalesProps) {
  if (sales.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma venda recente
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="space-y-3 min-w-80">
        {sales.map((sale) => (
          <div
            key={sale.id}
            className="flex items-center justify-between gap-4"
          >
            <div className="space-y-1">
              {/* 🛠️ Valor formatado em Reais */}
              <p className="text-sm font-bold whitespace-nowrap">
                {formatCurrency(Number(sale.total_amount))}
              </p>
              
              <p className="text-xs text-muted-foreground whitespace-nowrap italic">
                {formatDistanceToNow(new Date(sale.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </div>

            <Badge
              variant="secondary"
              className="whitespace-nowrap"
            >
              {paymentMethodLabels[sale.payment_method] ||
                sale.payment_method}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}