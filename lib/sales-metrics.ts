// lib/sales-metrics.ts

export type Sale = {
    created_at: string
    total_amount: number
  }
  
  export type ChartType = "sales" | "revenue" | "ticket"
  export type GroupBy = "day" | "month"
  
  // 🔹 Tipo que representa o objeto completo
  export type SalesMetrics = {
    rows: {
      period: string
      sales: number
      revenue: number
      ticket: number
      value: number
    }[]
    summary: {
      totalSales: number
      totalRevenue: number
      averageTicket: number
    }
    chartData: {
      date: string
      value: number
    }[]
  }
  
  export function calculateSalesMetrics(
    sales: Sale[],
    type: ChartType,
    groupBy: GroupBy
  ): SalesMetrics {   // 🔹 retorno tipado corretamente
    const grouped = sales.reduce<
      Record<string, { total: number; count: number }>
    >((acc, sale) => {
      const date = new Date(sale.created_at)
  
      const key =
        groupBy === "day"
          ? date.toLocaleDateString("pt-BR")
          : `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`
  
      if (!acc[key]) {
        acc[key] = { total: 0, count: 0 }
      }
  
      acc[key].count += 1
      acc[key].total += Number(sale.total_amount)
  
      return acc
    }, {})
  
    const rows = Object.entries(grouped).map(([period, values]) => ({
      period,
      sales: values.count,
      revenue: values.total,
      ticket: values.count > 0 ? values.total / values.count : 0,
      value:
        type === "sales"
          ? values.count
          : type === "ticket"
          ? values.total / values.count
          : values.total,
    }))
  
    const summary = {
      totalSales: rows.reduce((acc, r) => acc + r.sales, 0),
      totalRevenue: rows.reduce((acc, r) => acc + r.revenue, 0),
      averageTicket:
        rows.reduce((acc, r) => acc + r.sales, 0) > 0
          ? rows.reduce((acc, r) => acc + r.revenue, 0) /
            rows.reduce((acc, r) => acc + r.sales, 0)
          : 0,
    }
  
    return {
      rows,
      summary,
      chartData: rows.map((r) => ({
        date: r.period,
        value: r.value,
      })),
    }
  }
  