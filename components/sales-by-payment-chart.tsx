"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts"

interface SalesByPayment {
  payment_method: string
  total: number
}

const COLORS: Record<string, string> = {
  Pix: "#4ade80",
  Crédito: "#3b82f6",
  Débito: "#8b5cf6",
  Dinheiro: "#22c55e",
  VR: "#f59e0b",
  VA: "#fbbf24",
}

const labels: Record<string, string> = {
  pix: "Pix",
  credit: "Crédito",
  debit: "Débito",
  cash: "Dinheiro",
  vr: "VR",
  va: "VA",
}

export function SalesByPaymentChart() {
  const [data, setData] = useState<SalesByPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.rpc("vendas_por_pagamento", {
        periodo: 30,
      })

      if (error) {
        console.error("Erro ao buscar vendas:", error)
        setLoading(false)
        return
      }

      const formatted =
        data?.map((item: SalesByPayment) => ({
          payment_method:
            labels[item.payment_method] || item.payment_method,
          total: Number(item.total),
        })) || []

      setData(formatted)
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-65 text-sm text-muted-foreground">
        Carregando gráfico...
      </div>
    )
  }

  return (
    <div className="w-full h-65 sm:h-75">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            type="number"
            tickFormatter={(value) => `R$ ${value}`}
          />

          <YAxis
            type="category"
            dataKey="payment_method"
            width={80}
          />

          <Tooltip
            formatter={(value: number) =>
              `R$ ${value.toFixed(2)}`
            }
          />

          <Bar dataKey="total" radius={[6, 6, 6, 6]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={COLORS[entry.payment_method] || "#8884d8"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}