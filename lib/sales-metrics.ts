export type Sale = {
  created_at: string
  total_value: number
  payment_method?: string
}

export type ChartType = "sales" | "revenue" | "ticket"
export type GroupBy = "day" | "month"

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

  paymentTotals: {
    method: string
    total: number
  }[]

  chartData: {
    date: string
    value: number
  }[]

  total: number
  average: number
  labels: string[]
}

/* =========================
   TIMEZONE FIX (ESTÁVEL)
========================= */

function getBrazilDate(date: string) {
  const d = new Date(date)

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

function getBrazilMonth(date: string) {
  const d = new Date(date)

  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d)

  const month = parts.find((p) => p.type === "month")?.value
  const year = parts.find((p) => p.type === "year")?.value

  return `${month}/${year}`
}

/* =========================
   MÉTRICAS
========================= */

export function calculateSalesMetrics(
  sales: Sale[],
  type: ChartType,
  groupBy: GroupBy
): SalesMetrics {

  const grouped = sales.reduce<
    Record<string, { total: number; count: number }>
  >((acc, sale) => {

    const key =
      groupBy === "day"
        ? getBrazilDate(sale.created_at)
        : getBrazilMonth(sale.created_at)

    if (!acc[key]) {
      acc[key] = { total: 0, count: 0 }
    }

    acc[key].count += 1
    acc[key].total += Number(sale.total_value)

    return acc

  }, {})

  const rows = Object.entries(grouped)
    .map(([period, values]) => ({
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
    .sort((a, b) => {
      const [d1, m1, y1] = a.period.split("/")
      const [d2, m2, y2] = b.period.split("/")

      const dateA = new Date(`${y1}-${m1}-${d1}`)
      const dateB = new Date(`${y2}-${m2}-${d2}`)

      return dateA.getTime() - dateB.getTime()
    })

  const totalSales = rows.reduce((acc, r) => acc + r.sales, 0)
  const totalRevenue = rows.reduce((acc, r) => acc + r.revenue, 0)

  const summary = {
    totalSales,
    totalRevenue,
    averageTicket: totalSales > 0 ? totalRevenue / totalSales : 0,
  }

  const total =
    type === "sales"
      ? summary.totalSales
      : type === "revenue"
      ? summary.totalRevenue
      : summary.averageTicket

  const average =
    rows.length > 0
      ? rows.reduce((acc, r) => acc + r.value, 0) / rows.length
      : 0

  const labels = rows.map((r) => r.period)

  /* =========================
     TOTAIS POR PAGAMENTO
  ========================= */

  const paymentMap: Record<string, number> = {}

  sales.forEach((sale) => {

    const method = sale.payment_method || "Outros"

    if (!paymentMap[method]) {
      paymentMap[method] = 0
    }

    paymentMap[method] += Number(sale.total_value)

  })

  const paymentTotals = Object.entries(paymentMap).map(([method, total]) => ({
    method,
    total,
  }))

  /* =========================
     RETORNO FINAL
  ========================= */

  return {
    rows,
    summary,
    paymentTotals,
    chartData: rows.map((r) => ({
      date: r.period,
      value: r.value,
    })),
    total,
    average,
    labels,
  }
}