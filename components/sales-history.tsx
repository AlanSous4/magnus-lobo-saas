"use client";

import { SalesChart } from "@/components/sales-chart";
import { useMemo, useState, Fragment, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  calculateSalesMetrics,
  Sale as MetricsSale,
  SalesMetrics,
} from "@/lib/sales-metrics";

import { useSalesRealtime } from "@/hooks/use-sales-realtime";
import type { Sale } from "@/types/sale";
import { exportSalesPDF } from "@/components/pdf-export";
import { Eye, FileText } from "lucide-react";

export type SalesHistoryProps = {
  type: "sales" | "revenue" | "ticket";
  groupBy: "day" | "month";
  userId: string;
};

type PeriodMode = "daily" | "month";

/* =========================
   TIMEZONE FIX - XEQUE-MATE (STRING PURA)
========================= */

function getLocalDate(dateStr: string | Date) {
  if (!dateStr) return "";

  // Se for a string do Supabase (ISO), pegamos apenas os primeiros 10 caracteres "YYYY-MM-DD"
  // Isso ignora qualquer cálculo de fuso horário do navegador.
  if (typeof dateStr === "string" && dateStr.includes("T")) {
    return dateStr.substring(0, 10);
  }

  // Fallback para outros formatos
  return new Date(dateStr).toLocaleDateString("sv-SE", {
    timeZone: "America/Sao_Paulo",
  });
}

function getLocalMonth(dateStr: string | Date) {
  const date = getLocalDate(dateStr);
  return date.slice(0, 7); // Retorna "YYYY-MM"
}

function formatBR(dateISO: string) {
  if (!dateISO || !dateISO.includes("-")) return dateISO;
  const [year, month, day] = dateISO.split("-");
  return `${day}/${month}/${year}`;
}
function formatHour(date: string | Date) {
  return new Date(date).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPaymentMethod(method: string | null | undefined) {
  if (!method || method.trim() === "") return "Não informado";

  const labels: Record<string, string> = {
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

  let formatted = method.toLowerCase();
  Object.entries(labels).forEach(([key, value]) => {
    // Busca exata para evitar trocar "credito" dentro de outra palavra por erro
    const regex = new RegExp(`\\b${key}\\b`, "gi");
    formatted = formatted.replace(regex, value);
  });

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function SalesHistory({ type, groupBy, userId }: SalesHistoryProps) {
  // Apenas Diário e Mês agora
  const [periodMode, setPeriodMode] = useState<"daily" | "month">("daily");
  const [selectedDate, setSelectedDate] = useState(getLocalDate(new Date()));
  const [monthStart, setMonthStart] = useState(getLocalMonth(new Date()));
  const [monthEnd, setMonthEnd] = useState(getLocalMonth(new Date()));
  const [expandedLabel, setExpandedLabel] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; // Define o bloco de 15 dias

  const dateRange = useMemo(() => {
    if (periodMode === "daily") {
      return { start: selectedDate, end: selectedDate };
    }
  
    // Lógica para período entre meses
    const [yearEnd, mEnd] = monthEnd.split("-").map(Number);
    const lastDayOfEndMonth = new Date(yearEnd, mEnd, 0).getDate();
  
    return { 
      start: `${monthStart}-01`, 
      end: `${monthEnd}-${String(lastDayOfEndMonth).padStart(2, '0')}` 
    };
  }, [periodMode, selectedDate, monthStart, monthEnd]);

  // Hook que busca os dados no Supabase baseado no range acima
  const { sales, loading } = useSalesRealtime({
    userId,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  /* =========================
     NORMALIZAÇÃO E FILTRAGEM
  ========================= */
  const typedSales: Sale[] = useMemo(() => {
    return sales.map((s: any) => ({
      ...s,
      total_value: s.total_value ?? s.total_amount ?? 0,
      payment_method: s.payment_method,
      items: s.items ?? [],
    }));
  }, [sales]);

  const filteredSales = useMemo(() => {
    let filtered = typedSales;
    
    if (periodMode === "daily") {
      filtered = typedSales.filter(s => getLocalDate(s.created_at) === selectedDate);
    } else {
      // Filtra tudo que está entre o mês inicial e o final
      filtered = typedSales.filter(s => {
        const sMonth = getLocalMonth(s.created_at);
        return sMonth >= monthStart && sMonth <= monthEnd;
      });
    }
    
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [typedSales, periodMode, selectedDate, monthStart, monthEnd]);

  const salesForMetrics: MetricsSale[] = filteredSales.map((s) => ({
    created_at: s.created_at,
    total_value: s.total_value ?? 0,
    payment_method: s.payment_method ?? undefined,
  }));

  const metrics: SalesMetrics = calculateSalesMetrics(
    salesForMetrics,
    type,
    groupBy
  );

  // Labels para a tabela (Ordem CRESCENTE: do dia 01 para frente)
const labelsToRender = useMemo(() => {
  if (periodMode === "daily") return [formatBR(selectedDate)];

  if (periodMode === "month") {
    // Pegamos os dias que tiveram vendas no intervalo (Jan a Abr, por exemplo)
    const daysWithSales = filteredSales.map(s => formatBR(getLocalDate(s.created_at)));
    
    // Set remove duplicados. O sort abaixo coloca do dia mais antigo para o mais novo
    return Array.from(new Set(daysWithSales)).sort((a, b) => {
      // Converte "DD/MM/YYYY" para "YYYY-MM-DD" para o JS conseguir comparar datas
      const dateA = a.split('/').reverse().join('-');
      const dateB = b.split('/').reverse().join('-');
      
      // ORDEM CRESCENTE: Menor para o Maior
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
  }

  // Fallback para as métricas (também em ordem crescente)
  return [...metrics.labels]; 
}, [filteredSales, periodMode, selectedDate]);

// --- BLOCO DE PAGINAÇÃO ---
const totalPages = Math.ceil(labelsToRender.length / itemsPerPage);

const paginatedLabels = useMemo(() => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  return labelsToRender.slice(startIndex, startIndex + itemsPerPage);
}, [labelsToRender, currentPage]);

useEffect(() => {
  setCurrentPage(1);
}, [monthStart, monthEnd, selectedDate, periodMode]);
// --------------------------

  /* =========================
     PDF
  ========================= */

  const handleViewPDF = async () => {
    const pdf = await exportSalesPDF(metrics, type, groupBy);
    const blobUrl = pdf.output("bloburl");
    window.open(blobUrl);
  };

  const handleDownloadPDF = async () => {
    const pdf = await exportSalesPDF(metrics, type, groupBy);
    pdf.save("relatorio_vendas.pdf");
  };

  if (loading)
    return (
      <p className="text-sm text-muted-foreground">Carregando vendas...</p>
    );

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <CardTitle>
            Relatório de{" "}
            {type === "sales"
              ? "Vendas"
              : type === "ticket"
              ? "Ticket Médio"
              : "Receita"}
          </CardTitle>

          <div className="flex gap-2 flex-wrap items-center">
            {/* BOTÃO DIÁRIO */}
            <Button
              className="cursor-pointer"
              size="sm"
              variant={periodMode === "daily" ? "default" : "outline"}
              onClick={() => setPeriodMode("daily")}
            >
              Diário
            </Button>

            {periodMode === "daily" && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded px-2 py-1 text-sm bg-background"
              />
            )}

            {/* BOTÃO MÊS */}
            <Button
              className="cursor-pointer"
              size="sm"
              variant={periodMode === "month" ? "default" : "outline"}
              onClick={() => setPeriodMode("month")}
            >
              Mês
            </Button>

            {periodMode === "month" && (
  <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md">
    <span className="text-xs font-medium px-1">De:</span>
    <input
      type="month"
      value={monthStart}
      onChange={(e) => setMonthStart(e.target.value)}
      className="border rounded px-2 py-1 text-sm bg-background"
    />
    <span className="text-xs font-medium px-1">Até:</span>
    <input
      type="month"
      value={monthEnd}
      onChange={(e) => setMonthEnd(e.target.value)}
      className="border rounded px-2 py-1 text-sm bg-background"
    />
  </div>
)}
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <Button
              className="cursor-pointer"
              size="sm"
              variant="outline"
              onClick={handleViewPDF}
            >
              <Eye className="mr-2 h-4 w-4" /> Visualizar PDF
            </Button>

            <Button
              className="cursor-pointer"
              size="sm"
              variant="default"
              onClick={handleDownloadPDF}
            >
              <FileText className="mr-2 h-4 w-4" /> Baixar PDF
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* RESUMO */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <strong>Total de vendas</strong>
            <p>{metrics.summary.totalSales}</p>
          </div>
          <div>
            <strong>Receita total</strong>
            <p>R$ {formatCurrency(metrics.summary.totalRevenue)}</p>
          </div>
          <div>
            <strong>Ticket médio</strong>
            <p>{formatCurrency(metrics.summary.averageTicket)}</p>
          </div>
        </div>

        {/* TABELA */}
        <div className="overflow-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">Período</th>
                <th className="p-2 text-right">Vendas</th>
                <th className="p-2 text-right">Receita</th>
                <th className="p-2 text-right">Ticket Médio</th>
              </tr>
            </thead>

            <tbody>
            {paginatedLabels.map((label) => {
                // IMPORTANTE: Filtra as vendas que pertencem EXATAMENTE a este label DD/MM/AAAA
                const periodSales = filteredSales.filter(
                  (s) => formatBR(getLocalDate(s.created_at)) === label
                );

                // Se não houver vendas no dia, não mostra a linha (exceto no modo Diário fixo)
                if (periodSales.length === 0 && periodMode !== "daily")
                  return null;

                const revenue = periodSales.reduce(
                  (sum, s) => sum + (s.total_value ?? 0),
                  0
                );
                const averageTicket =
                  periodSales.length > 0 ? revenue / periodSales.length : 0;
                const isOpen = expandedLabel === label;

                return (
                  // Mantenha o seu <Fragment key={label}> e o restante do JSX abaixo
                  <Fragment key={label}>
                    <tr
                      className="border-t cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedLabel(isOpen ? null : label)}
                    >
                      <td className="p-2">{label}</td>
                      <td className="p-2 text-right">{periodSales.length}</td>
                      <td className="p-2 text-right">
                        {formatCurrency(revenue)}
                      </td>
                      <td className="p-2 text-right">
                        {formatCurrency(averageTicket)}
                      </td>
                    </tr>

                    {isOpen &&
                      periodSales.map((sale) => (
                        <tr key={sale.id} className="bg-muted/30">
                          <td colSpan={4} className="p-3">
                            <div className="space-y-2 text-sm border-b pb-2">
                              <div className="flex justify-between font-semibold">
                                <span className="flex items-center gap-6">
                                  Venda #{sale.id.slice(0, 6)}
                                  <span className="text-muted-foreground text-xs">
                                    🕒 {formatHour(sale.created_at)}
                                  </span>
                                </span>

                                <span>
                                  Pagamento:{" "}
                                  {formatPaymentMethod(sale.payment_method)}
                                </span>

                                <span>
                                  Total: {formatCurrency(sale.total_value ?? 0)}
                                </span>
                              </div>

                              <div className="pl-4 space-y-1">
                                {sale.items.length > 0 ? (
                                  sale.items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="grid grid-cols-3 items-center px-2 py-1 rounded hover:bg-[rgb(255,237,212)] transition-colors"
                                    >
                                      <span>{item.product_name}</span>

                                      <span className="text-center">
                                        {item.is_weight
                                          ? `${item.quantity.toFixed(3)} KG`
                                          : `${item.quantity} UN`}
                                      </span>

                                      <span className="text-right">
                                        {formatCurrency(item.total)}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-muted-foreground">
                                    Venda sem itens detalhados
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* INSERIR O BLOCO DE PAGINAÇÃO AQUI (ENTRE AS DUAS DIVS) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-4 border-t">
            <p className="text-xs text-muted-foreground">
              Mostrando página {currentPage} de {totalPages} ({labelsToRender.length} dias no total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}

        {/* GRÁFICO INVISÍVEL PARA PDF */}
        <div
          style={{
            position: "absolute",
            left: "-9999px",
            top: 0,
            width: "900px",
            height: "400px",
          }}
        >
          <SalesChart
            sales={salesForMetrics}
            type={type}
            initialGroupBy={groupBy}
            chartId="sales-chart-pdf"
          />
        </div>
      </CardContent>
    </Card>
  );
}
