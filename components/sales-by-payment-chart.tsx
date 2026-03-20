"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { Button } from "@/components/ui/button"

interface SalesByPayment {
  payment_method: string
  total: number
}

const COLORS = [
  "#22c55e", // pix
  "#3b82f6", // crédito
  "#f59e0b", // débito
  "#ef4444", // dinheiro
  "#8b5cf6", // vr
  "#06b6d4", // va
]

const labels: Record<string, string> = {
  pix: "Pix",
  credit: "Crédito",
  debit: "Débito",
  cash: "Dinheiro",
  vr: "VR",
  va: "VA",
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function SalesByPaymentChart() {
  const [data, setData] = useState<SalesByPayment[]>([])
  const [period, setPeriod] = useState<number>(30)
  const [loading, setLoading] = useState(false)

  const fetchData = async (days: number) => {
    setLoading(true)
    const { data, error } = await supabase.rpc("vendas_por_pagamento", {
      periodo: days,
    })

    if (error) {
      console.error("Erro ao buscar vendas:", error)
      setLoading(false)
      return
    }

    const formatted =
      data?.map((item: SalesByPayment) => ({
        ...item,
        payment_method: labels[item.payment_method] || item.payment_method,
      })) || []

    setData(formatted)
    setLoading(false)
  }

  useEffect(() => {
    fetchData(period)
  }, [period])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Vendas por forma de pagamento</CardTitle>

        <div className="flex gap-2 flex-wrap">
          {[1, 7, 30, 90].map((d) => (
            <Button
              key={d}
              className="cursor-pointer"
              size="sm"
              variant={period === d ? "default" : "outline"}
              onClick={() => setPeriod(d)}
            >
              {d === 1 ? "Hoje" : `${d} dias`}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="h-70 sm:h-80">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Carregando gráfico...
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Nenhuma venda encontrada
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="total"
                nameKey="payment_method"
                outerRadius={100}
                // 🛠️ REMOVIDO: a prop label foi retirada para ocultar os valores fixos
                label={false} 
              >
                {data.map((_, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                    className="outline-none" // Remove a borda de seleção ao clicar
                  />
                ))}
              </Pie>

              {/* 🛠️ O valor só aparecerá aqui ao passar o mouse */}
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: 'none', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)' 
                }}
              />

              <Legend 
                verticalAlign="bottom"
                height={36}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}