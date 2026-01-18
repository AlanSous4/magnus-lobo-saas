import jsPDF from "jspdf"
import type { SalesMetrics } from "@/lib/sales-metrics"

type ChartType = "sales" | "revenue" | "ticket"
type GroupBy = "day" | "month"

export function exportSalesPDF(
  metrics: SalesMetrics,
  type: ChartType,
  groupBy: GroupBy
) {
  const pdf = new jsPDF()

  const title =
    type === "sales"
      ? "Relatório de Vendas"
      : type === "ticket"
      ? "Relatório de Ticket Médio"
      : "Relatório de Receita"

  // 🔹 Título
  pdf.setFontSize(16)
  pdf.text(title, 14, 20)

  // 🔹 Subtítulo
  pdf.setFontSize(11)
  pdf.text(
    `Agrupamento: ${groupBy === "day" ? "Diário" : "Mensal"}`,
    14,
    30
  )

  // 🔹 Resumo
  pdf.setFontSize(12)
  pdf.text("Resumo Geral", 14, 40)

  pdf.setFontSize(10)
  pdf.text(
    `Total de vendas: ${metrics.summary.totalSales}`,
    14,
    48
  )
  pdf.text(
    `Receita total: R$ ${metrics.summary.totalRevenue.toFixed(2)}`,
    14,
    54
  )
  pdf.text(
    `Ticket médio: R$ ${metrics.summary.averageTicket.toFixed(2)}`,
    14,
    60
  )

  // 🔹 Tabela simples
  let y = 72
  pdf.setFontSize(11)
  pdf.text("Detalhamento por período", 14, y)
  y += 8

  pdf.setFontSize(9)
  metrics.rows.forEach((row) => {
    pdf.text(
      `${row.period} | Vendas: ${row.sales} | Receita: R$ ${row.revenue.toFixed(
        2
      )} | Ticket: R$ ${row.ticket.toFixed(2)}`,
      14,
      y
    )
    y += 7
  })

  return pdf
}
