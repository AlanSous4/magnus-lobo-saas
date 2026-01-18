import jsPDF from "jspdf"
import type { SalesMetrics } from "@/lib/sales-metrics"
import * as htmlToImage from "html-to-image"
import { createClient } from "@/lib/supabase/client"

type ChartType = "sales" | "revenue" | "ticket"
type GroupBy = "day" | "month"

const CNPJ_FIXO = "60.227.207.0001-25"

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
   🔹 Converter gráfico em imagem
   ========================= */
async function chartToPng(elementId: string): Promise<string> {
  const node = document.getElementById(elementId)

  if (!node) {
    throw new Error("Gráfico não encontrado")
  }

  return await htmlToImage.toPng(node, {
    pixelRatio: 2,
    backgroundColor: "transparent", // mantém transparência
  })
}

/* =========================
   🔹 Marca d’água
   ========================= */
function drawWatermark(
  pdf: jsPDF,
  logo: HTMLImageElement,
  opacity = 0.28
) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  const logoWidth = pageWidth * 0.95
  const logoHeight = logoWidth * (logo.height / logo.width)

  const x = (pageWidth - logoWidth) / 2
  const y = (pageHeight - logoHeight) / 2

  const anyPdf = pdf as any
  anyPdf.saveGraphicsState()
  anyPdf.setGState(new anyPdf.GState({ opacity }))

  pdf.addImage(logo, "PNG", x, y, logoWidth, logoHeight)

  anyPdf.restoreGraphicsState()
}

/* =========================
   🔹 Rodapé
   ========================= */
function drawFooter(
  pdf: jsPDF,
  {
    user,
    period,
  }: {
    user: string
    period: string
  }
) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const footerY = pageHeight - 10

  const now = new Date().toLocaleString("pt-BR")

  pdf.setFontSize(8)
  pdf.setTextColor(120)

  // Esquerda
  pdf.text(`Gerado em ${now}`, 14, footerY)

  // Centro
  pdf.text(`CNPJ: ${CNPJ_FIXO}`, pageWidth / 2, footerY, {
    align: "center",
  })

  // Direita
  pdf.text(
    `Usuário: ${user} | Período: ${period}`,
    pageWidth - 14,
    footerY,
    { align: "right" }
  )
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
  const logo = await loadImage("/Novo-logo-recortado.png")

  /* 🔐 Usuário logado */
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userName =
    user?.user_metadata?.name ||
    user?.email ||
    "Usuário não identificado"

  const periodLabel = groupBy === "day" ? "Diário" : "Mensal"

  /* =========================
     📄 PÁGINA 1 — RESUMO + TABELA
     ========================= */
  drawWatermark(pdf, logo)

  const title =
    type === "sales"
      ? "Relatório de Vendas"
      : type === "ticket"
      ? "Relatório de Ticket Médio"
      : "Relatório de Receita"

  pdf.setFontSize(16)
  pdf.text(title, 14, 20)

  pdf.setFontSize(11)
  pdf.text(`Agrupamento: ${periodLabel}`, 14, 28)

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
      drawFooter(pdf, {
        user: userName,
        period: periodLabel,
      })

      pdf.addPage()
      drawWatermark(pdf, logo)
      yCursor = 20
    }

    pdf.text(row.period, 14, yCursor)
    pdf.text(String(row.sales), 70, yCursor)
    pdf.text(`R$ ${row.revenue.toFixed(2)}`, 100, yCursor)
    pdf.text(`R$ ${row.ticket.toFixed(2)}`, 150, yCursor)

    yCursor += 6
  })

  drawFooter(pdf, {
    user: userName,
    period: periodLabel,
  })

  /* =========================
     📄 PÁGINA 2 — SOMENTE GRÁFICO
     ========================= */
  pdf.addPage()
  drawWatermark(pdf, logo)

  const chartImage = await chartToPng("sales-chart")
  const pageWidth = pdf.internal.pageSize.getWidth()

  pdf.setFontSize(14)
  pdf.text("Gráfico de Desempenho", 14, 20)

  pdf.addImage(chartImage, "PNG", 14, 30, pageWidth - 28, 140)

  drawFooter(pdf, {
    user: userName,
    period: periodLabel,
  })

  return pdf
}
