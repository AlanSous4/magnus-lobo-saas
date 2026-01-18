import jsPDF from "jspdf"
import type { SalesMetrics } from "@/lib/sales-metrics"

type ChartType = "sales" | "revenue" | "ticket"
type GroupBy = "day" | "month"

/* =========================
   🔹 Carregar imagem
   ========================= */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = src
    img.onload = () => resolve(img)
    img.onerror = reject
  })
}

/* =========================
   🔹 Marca d’água (CORRIGIDA)
   ========================= */
function drawWatermark(
  pdf: jsPDF,
  logo: HTMLImageElement,
  opacity = 0.28
) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  // 🔥 Logo ocupa quase a folha inteira
  const logoWidth = pageWidth * 0.95
  const logoHeight = logoWidth * (logo.height / logo.width)

  const x = (pageWidth - logoWidth) / 2
  const y = (pageHeight - logoHeight) / 2

  const anyPdf = pdf as any

  // ✅ Salva estado gráfico
  anyPdf.saveGraphicsState()

  // ✅ Aplica opacidade real
  anyPdf.setGState(
    new anyPdf.GState({ opacity })
  )

  // 🖼 Marca d’água
  pdf.addImage(logo, "PNG", x, y, logoWidth, logoHeight)

  // 🔁 Restaura estado gráfico
  anyPdf.restoreGraphicsState()
}

/* =========================
   🔹 Export PDF
   ========================= */
export async function exportSalesPDF(
  metrics: SalesMetrics,
  type: ChartType,
  groupBy: GroupBy
) {
  const pdf = new jsPDF()

  // 🖼 Logo
  const logo = await loadImage("/Novo-logo-recortado.png")

  // 🟡 Marca d’água na primeira página
  drawWatermark(pdf, logo)

  /* =========================
     🔹 TÍTULO
     ========================= */
  const title =
    type === "sales"
      ? "Relatório de Vendas"
      : type === "ticket"
      ? "Relatório de Ticket Médio"
      : "Relatório de Receita"

  pdf.setFontSize(16)
  pdf.text(title, 14, 20)

  pdf.setFontSize(11)
  pdf.text(
    `Agrupamento: ${groupBy === "day" ? "Diário" : "Mensal"}`,
    14,
    28
  )

  /* =========================
     🔹 RESUMO
     ========================= */
  let yCursor = 45

  pdf.setFontSize(12)
  pdf.text("Resumo Geral", 14, yCursor)

  yCursor += 8
  pdf.setFontSize(10)
  pdf.text(`Total de vendas: ${metrics.summary.totalSales}`, 14, yCursor)

  yCursor += 6
  pdf.text(
    `Receita total: R$ ${metrics.summary.totalRevenue.toFixed(2)}`,
    14,
    yCursor
  )

  yCursor += 6
  pdf.text(
    `Ticket médio: R$ ${metrics.summary.averageTicket.toFixed(2)}`,
    14,
    yCursor
  )

  /* =========================
     🔹 TABELA
     ========================= */
  yCursor += 12

  pdf.setFontSize(11)
  pdf.text("Detalhamento por período", 14, yCursor)

  yCursor += 8
  pdf.setFontSize(10)
  pdf.text("Período", 14, yCursor)
  pdf.text("Vendas", 70, yCursor)
  pdf.text("Receita", 100, yCursor)
  pdf.text("Ticket Médio", 150, yCursor)

  yCursor += 4
  pdf.line(14, yCursor, 195, yCursor)
  yCursor += 6

  pdf.setFontSize(9)

  metrics.rows.forEach((row) => {
    if (yCursor > 280) {
      pdf.addPage()

      // 🔁 Marca d’água nas novas páginas
      drawWatermark(pdf, logo)

      yCursor = 20
    }

    pdf.text(row.period, 14, yCursor)
    pdf.text(String(row.sales), 70, yCursor)
    pdf.text(`R$ ${row.revenue.toFixed(2)}`, 100, yCursor)
    pdf.text(`R$ ${row.ticket.toFixed(2)}`, 150, yCursor)

    yCursor += 6
  })

  return pdf
}
