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
    TIMEZONE FIX (VERSÃO BLINDADA)
========================= */

function getBrazilDate(dateStr: string) {
  // Criamos o objeto de data
  const d = new Date(dateStr);
  
  // Usamos o formatador para garantir que ele extraia o dia/mês/ano 
  // exatamente como se estivéssemos em São Paulo, independente de onde o servidor rode.
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function getBrazilMonth(dateStr: string) {
  const d = new Date(dateStr);
  
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(d);

  const month = parts.find((p) => p.type === "month")?.value;
  const year = parts.find((p) => p.type === "year")?.value;
  return `${month}/${year}`;
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
        return new Date(`${y1}-${m1}-${d1}`).getTime() - new Date(`${y2}-${m2}-${d2}`).getTime()
      }

      const [m1, y1] = partsA
      const [m2, y2] = partsB
      return new Date(`${y1}-${m1}-01`).getTime() - new Date(`${y2}-${m2}-01`).getTime()
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
      TOTAIS POR PAGAMENTO (UNIFICADO)
  ========================= */

  const paymentMap: Record<string, { total: number; count: number }> = {};

  const labelMap: Record<string, string> = {
    va: "Vale Alimentação",
    vr: "Vale Refeição",
    cash: "Dinheiro",
    dinheiro: "Dinheiro",
    pix: "Pix",
    credit: "Crédito",
    credito: "Crédito",
    debit: "Débito",
    debito: "Débito",
  };

  sales.forEach((sale) => {
    const rawMethod = (sale.payment_method || "Não informado").toLowerCase().trim();

    if (rawMethod.includes("+")) {
      // 1. Pagamento misto
      const parts = rawMethod.split("+");
      parts.forEach((part) => {
        const codeMatch = part.match(/(va|vr|cash|dinheiro|pix|credit|credito|debit|debito)/i);
        const valueMatch = part.match(/\d+(\.\d+)?/);

        if (codeMatch && valueMatch) {
          const code = codeMatch[0].toLowerCase();
          const value = parseFloat(valueMatch[0]);
          const label = labelMap[code] || code;

          if (!paymentMap[label]) paymentMap[label] = { total: 0, count: 0 };
          paymentMap[label].total += value;
          paymentMap[label].count += 1;
        }
      });
    } else {
      // 2. Pagamento simples (Normalizado para evitar duplicatas como Crédito/CRÉDITO)
      const label = labelMap[rawMethod] || rawMethod.charAt(0).toUpperCase() + rawMethod.slice(1);

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