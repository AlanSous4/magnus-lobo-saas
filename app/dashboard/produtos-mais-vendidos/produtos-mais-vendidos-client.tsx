"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Package, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Produto = { nome: string; quantidade: number };
type VendaItem = { nome: string; quantidade: number; valor: number };
type Venda = {
  venda_id: string;
  data_venda: string;
  payment_method: string;
  items: VendaItem[];
  total: number;
};

const paymentLabelMap: Record<string, string> = {
  cash: "Dinheiro",
  card: "Cartão",
  pix: "PIX",
  vr: "Vale Refeição",
  va: "Vale Alimentação",
};

export default function ProdutosMaisVendidosClient() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [totalVendidos, setTotalVendidos] = useState<number>(0);
  const [periodo, setPeriodo] = useState("7");
  const [vendasProduto, setVendasProduto] = useState<Venda[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string | null>(null);

  async function fetchProdutosMaisVendidos() {
    const { data, error } = await supabase.rpc("produtos_mais_vendidos", { periodo: parseInt(periodo) });
    if (!error && data) {
      const normalizedData = (data as Produto[]).map(item => ({
        nome: item.nome || "Produto desconhecido",
        quantidade: item.quantidade,
      }));
      setProdutos(normalizedData);
      setTotalVendidos(normalizedData.reduce((acc, item) => acc + item.quantidade, 0));
    }
  }

  async function fetchVendasPorProduto(nome: string) {
    // 1. Definir a data de início baseada no período selecionado
    const dataInicio = new Date();
    if (periodo === "0") {
      // Se for hoje, pegamos desde o primeiro segundo do dia (00:00:00)
      dataInicio.setHours(0, 0, 0, 0);
    } else {
      // Se forem dias (7, 30, 90), subtraímos da data atual
      dataInicio.setDate(dataInicio.getDate() - parseInt(periodo));
    }
  
    // 2. Buscar itens filtrando por NOME e por DATA (via join com a tabela sales)
    const { data: items, error: itemsError } = await supabase
      .from("sale_items")
      .select(`
        sale_id,
        quantity,
        unit_price,
        products!inner(name),
        sales!inner(id, payment_method, created_at)
      `)
      .eq("products.name", nome)
      .gte("sales.created_at", dataInicio.toISOString()); // O FILTRO QUE FALTAVA
  
    if (itemsError || !items) {
      console.error("Erro ao buscar detalhes:", itemsError);
      return;
    }
  
    // 3. Organizar os dados para o estado
    const vendasMap: Record<string, Venda> = {};
  
    (items as any[]).forEach(item => {
      const saleData = item.sales;
      const vendaId = saleData.id;
      const paymentRaw = saleData.payment_method;
      const payment = paymentLabelMap[paymentRaw] || paymentRaw || "Desconhecido";
  
      if (!vendasMap[vendaId]) {
        vendasMap[vendaId] = {
          venda_id: vendaId,
          data_venda: saleData.created_at,
          payment_method: payment,
          items: [],
          total: 0,
        };
      }
  
      vendasMap[vendaId].items.push({
        nome: item.products?.name || "Produto",
        quantidade: item.quantity,
        valor: item.unit_price,
      });
  
      vendasMap[vendaId].total += item.unit_price * item.quantity;
    });
  
    setProdutoSelecionado(nome);
    setVendasProduto(Object.values(vendasMap));
  }

  useEffect(() => {
    fetchProdutosMaisVendidos();
    setProdutoSelecionado(null);
    setVendasProduto([]);
  }, [periodo]);

  const produtoLider = produtos[0];

  return (
    <main className="flex-1 px-4 py-6 space-y-6">
      {/* Título */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold">Produtos mais vendidos</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Análise dos produtos com maior saída no período
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm sm:text-base font-medium">Produto líder</CardTitle>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <p className="text-lg sm:text-xl font-bold">{produtoLider?.nome || "—"}</p>
            <Badge className="mt-2 bg-orange-100 text-orange-900">{produtoLider?.quantidade || 0} vendidos</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm sm:text-base font-medium">Total de itens vendidos</CardTitle>
            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold">{totalVendidos}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">no período selecionado</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Select defaultValue={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Hoje</SelectItem>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader><CardTitle>Top produtos vendidos</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={produtos}>
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantidade" radius={[6, 6, 0, 0]}>
                {produtos.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={["#ea580c","#f97316","#fb923c","#fdba74","#fed7aa"][index % 5]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card>
        <CardHeader><CardTitle>Ranking de vendas</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {produtos.map((item, index) => (
              <button
                key={item.nome}
                onClick={() => fetchVendasPorProduto(item.nome)}
                className="w-full text-left flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-3 hover:bg-orange-50 gap-2 sm:gap-0"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-orange-600">#{index + 1}</span>
                  <span className="font-medium">{item.nome}</span>
                </div>
                <Badge variant="secondary">{item.quantidade} vendidos</Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detalhes */}
      {produtoSelecionado && (
        <Card>
          <CardHeader><CardTitle>Vendas de {produtoSelecionado}</CardTitle></CardHeader>
          <CardContent>
            {vendasProduto.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma venda encontrada no período.</p>
            ) : (
              <div className="space-y-4 overflow-x-auto">
                {vendasProduto.map((venda) => (
                  <div key={venda.venda_id} className="border rounded p-3 min-w-75 space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span className="flex items-center gap-1">
                      <Clock size={16} className="text-muted-foreground" />
                      {new Date(venda.data_venda).toLocaleTimeString("pt-BR")}
                    </span>
                    <span>R$ {venda.total.toFixed(2)}</span>
                    <span>{venda.payment_method}</span>
                  </div>
                  <div className="pl-4 space-y-1">
                    {venda.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.nome} ({item.quantidade} UN)</span>
                        <span>R$ {item.valor.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}