export type Sale = {
  created_at: string
  total_value: number
  payment_method?: string | null
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
    count: number
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

      const partsA = a.period.split("/")
      const partsB = b.period.split("/")

      if (partsA.length === 3) {
        const [d1, m1, y1] = partsA
        const [d2, m2, y2] = partsB

        const dateA = new Date(`${y1}-${m1}-${d1}`)
        const dateB = new Date(`${y2}-${m2}-${d2}`)

        return dateA.getTime() - dateB.getTime()
      }

      const [m1, y1] = partsA
      const [m2, y2] = partsB

      const dateA = new Date(`${y1}-${m1}-01`)
      const dateB = new Date(`${y2}-${m2}-01`)

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
      TOTAIS POR PAGAMENTO (COM DECOMPOSIÇÃO)
  ========================= */

  const paymentMap: Record<string, { total: number; count: number }> = {};

  // Mapa de tradução para as chaves do banco
  const labelMap: Record<string, string> = {
    va: "Vale Alimentação",
    vr: "Vale Refeição",
    cash: "Dinheiro",
    pix: "Pix",
    credit: "Crédito",
    debit: "Débito",
  };

  sales.forEach((sale) => {
    const rawMethod = sale.payment_method || "Não informado";

    // 1. Verificar se é pagamento misto (ex: "va (R$ 4.00) + vr (R$ 4.00)")
    if (rawMethod.includes("+")) {
      const parts = rawMethod.split("+");

      parts.forEach((part) => {
        // Extrai o código (va, vr, etc) e o valor dentro dos parênteses
        const codeMatch = part.match(/(va|vr|cash|pix|credit|debit)/i);
        const valueMatch = part.match(/\d+(\.\d+)?/); // Pega o número (ex: 4.00)

        if (codeMatch && valueMatch) {
          const code = codeMatch[0].toLowerCase();
          const value = parseFloat(valueMatch[0]);
          const label = labelMap[code] || code;

          if (!paymentMap[label]) paymentMap[label] = { total: 0, count: 0 };
          
          paymentMap[label].total += value;
          // Contamos como 1 uso dessa forma de pagamento
          paymentMap[label].count += 1;
        }
      });
    } else {
      // 2. Pagamento simples
      const label = labelMap[rawMethod.toLowerCase()] || rawMethod;

      if (!paymentMap[label]) {
        paymentMap[label] = { total: 0, count: 0 };
      }

      paymentMap[label].total += Number(sale.total_value);
      paymentMap[label].count += 1;
    }
  });

  const paymentTotals = Object.entries(paymentMap).map(([method, values]) => ({
    method,
    total: values.total,
    count: values.count,
  }));

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