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

  pdf.setFontSize(16)
  pdf.text(title, 14, 20)

  pdf.setFontSize(11)
  pdf.text(`Agrupamento: ${groupBy === "day" ? "Diário" : "Mensal"}`, 14, 30)

  // 🔹 Resumo
  pdf.text(
    `Resumo: Total de Vendas = ${metrics.summary.totalSales}, ` +
      `Receita = R$ ${metrics.summary.totalRevenue.toFixed(2)}, ` +
      `Ticket Médio = R$ ${metrics.summary.averageTicket.toFixed(2)}`,
    14,
    38
  )

  let y = 50

  // 🔹 Detalhes por período
  metrics.rows.forEach((row) => {
    pdf.text(
      `${row.period}: ${row.sales} vendas | Receita R$ ${row.revenue.toFixed(
        2
      )} | Ticket Médio R$ ${row.ticket.toFixed(2)}`,
      14,
      y
    )
    y += 8
  })

  // 🔹 Dados do gráfico
  y += 10
  pdf.text("Dados do Gráfico:", 14, y)
  y += 8

  metrics.chartData.forEach((item) => {
    const value =
      type === "sales" ? `${item.value} vendas` : `R$ ${item.value.toFixed(2)}`
    pdf.text(`${item.date}: ${value}`, 14, y)
    y += 8
  })

  pdf.save("relatorio-vendas.pdf")
}
