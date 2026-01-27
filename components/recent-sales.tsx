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
}

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
      <div className="space-y-3 min-w-[320px]">
        {sales.map((sale) => (
          <div
            key={sale.id}
            className="flex items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium whitespace-nowrap">
                R$ {Number(sale.total_amount).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground whitespace-nowrap">
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
