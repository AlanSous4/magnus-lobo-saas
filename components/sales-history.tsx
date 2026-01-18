"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SalesChart } from "@/components/sales-chart"
import { Button } from "@/components/ui/button"
import { exportSalesPDF } from "@/components/pdf-export"
import { calculateSalesMetrics, SalesMetrics } from "@/lib/sales-metrics"

export type Sale = {
  id: string
  total_amount: number
  created_at: string
}

export type SalesHistoryProps = {
  sales: Sale[]
  type: "sales" | "revenue" | "ticket"
  groupBy: "day" | "month"
}

export function SalesHistory({ sales, type, groupBy }: SalesHistoryProps) {
  // 🔹 MÉTRICAS ÚNICAS (gráfico + PDF)
  const metrics: SalesMetrics = calculateSalesMetrics(sales, type, groupBy)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  /* =========================
     🔹 PRÉ-VISUALIZAÇÃO
     ========================= */
  async function handlePreviewPDF() {
    setLoading(true)

    const pdf = await exportSalesPDF(metrics, type, groupBy)
    const url = pdf.output("bloburl")

    setPreviewUrl(url.toString())
    setLoading(false)
  }

  /* =========================
     🔹 EXPORTAÇÃO
     ========================= */
  async function handleExportPDF() {
    setLoading(true)

    const pdf = await exportSalesPDF(metrics, type, groupBy)
    pdf.save("relatorio-vendas.pdf")

    setLoading(false)
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {type === "sales"
              ? "Quantidade de Vendas"
              : type === "ticket"
              ? "Ticket Médio"
              : "Receita por Período"}
          </CardTitle>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreviewPDF}
              disabled={loading}
            >
              {loading ? "Gerando..." : "Pré-visualizar PDF"}
            </Button>

            <Button
              onClick={handleExportPDF}
              disabled={loading}
            >
              {loading ? "Gerando..." : "Exportar PDF"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 🔹 Gráfico */}
          <SalesChart sales={sales} type={type} />

          {/* 🔹 Lista detalhada */}
          <div className="space-y-2">
            {sales.map((sale) => (
              <div key={sale.id} className="flex justify-between text-sm">
                <span>
                  {new Date(sale.created_at).toLocaleDateString("pt-BR")}
                </span>

                <span className="font-medium">
                  {type === "sales"
                    ? "1 venda"
                    : `R$ ${Number(sale.total_amount).toFixed(2)}`}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* =========================
         🔹 MODAL DE PRÉ-VISUALIZAÇÃO
         ========================= */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white w-[90%] h-[90%] rounded-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-3 border-b">
              <strong>Pré-visualização do PDF</strong>
              <Button variant="ghost" onClick={() => setPreviewUrl(null)}>
                Fechar
              </Button>
            </div>

            <iframe
              src={previewUrl}
              className="flex-1 w-full"
            />
          </div>
        </div>
      )}
    </>
  )
}
