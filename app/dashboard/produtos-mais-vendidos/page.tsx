"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TrendingUp, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Produto = {
  nome: string;
  quantidade: number;
};

type Venda = {
  venda_id: string;
  data_venda: string;
  quantidade: number;
  valor: number;
};

export default function ProdutosMaisVendidosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [totalVendidos, setTotalVendidos] = useState<number>(0);
  const [periodo, setPeriodo] = useState("7");
  const [vendasProduto, setVendasProduto] = useState<Venda[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string | null>(
    null
  );

  async function fetchProdutosMaisVendidos() {
    const { data, error } = await supabase.rpc("produtos_mais_vendidos", {
      periodo: parseInt(periodo),
    });

    if (!error && data) {
      setProdutos(data);
      setTotalVendidos(
        data.reduce((acc: number, item: Produto) => acc + item.quantidade, 0)
      );
    }
  }

  async function fetchVendasPorProduto(nome: string) {
    const { data, error } = await supabase.rpc("vendas_por_produto", {
      periodo: parseInt(periodo),
      produto_nome: nome,
    });

    if (!error && data) {
      setProdutoSelecionado(nome);
      setVendasProduto(data);
    }
  }

  useEffect(() => {
    fetchProdutosMaisVendidos();
    setProdutoSelecionado(null);
    setVendasProduto([]);
  }, [periodo]);

  const produtoLider = produtos[0];

  return (
    <div className="h-screen overflow-hidden flex">
      {/* 🔹 Menu lateral fixo */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r hidden md:flex flex-col">
        <div className="p-4 flex-1 overflow-y-auto">
          <h2 className="font-bold text-lg mb-4">Menu</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/dashboard">Dashboard</a>
            </li>
            <li>
              <a
                href="/produtos-mais-vendidos"
                className="font-semibold text-orange-600"
              >
                Produtos mais vendidos
              </a>
            </li>
          </ul>
        </div>
        <div className="p-4 border-t shrink-0">
          <span className="block text-sm font-medium mb-2">Usuário: Alan</span>
          <Button variant="outline" className="w-full">
            Sair
          </Button>
        </div>
      </aside>

      {/* 🔹 Área principal */}
      <div className="flex-1 flex flex-col md:ml-2 h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {/* Título */}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">Produtos mais vendidos</h1>
            <p className="text-sm text-muted-foreground">
              Análise dos produtos com maior saída no período
            </p>
          </div>

          {/* Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Produto líder
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">{produtoLider?.nome || "—"}</p>
                <Badge className="mt-2 bg-orange-100 text-orange-900">
                  {produtoLider?.quantidade || 0} vendidos
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de itens vendidos
                </CardTitle>
                <Package className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalVendidos}</p>
                <p className="text-xs text-muted-foreground">
                  no período selecionado
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <div className="flex items-center justify-between gap-4">
            <Select defaultValue={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-50">
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
            <CardHeader>
              <CardTitle>Top produtos vendidos</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={produtos}>
                  <XAxis dataKey="nome" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="quantidade" radius={[6, 6, 0, 0]}>
                    {produtos.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          [
                            "#5e6ac0",
                            "#7986cc",
                            "#9ea8db",
                            "#c6c9e8",
                            "#e8eaf6",
                          ][index % 5]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ranking Top 5 */}
          <Card>
            <CardHeader>
              <CardTitle>Ranking de vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {produtos.map((item, index) => (
                  <button
                    key={item.nome}
                    onClick={() => fetchVendasPorProduto(item.nome)}
                    className="w-full text-left flex items-center justify-between rounded-lg border p-3 hover:bg-orange-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-orange-600">
                        #{index + 1}
                      </span>
                      <span className="font-medium">{item.nome}</span>
                    </div>
                    <Badge variant="secondary">
                      {item.quantidade} vendidos
                    </Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detalhes do produto selecionado */}
          {produtoSelecionado && (
            <Card>
              <CardHeader>
                <CardTitle>Vendas de {produtoSelecionado}</CardTitle>
              </CardHeader>
              <CardContent>
                {vendasProduto.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma venda encontrada no período.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {vendasProduto.map((venda) => (
                      <div
                        key={venda.venda_id}
                        className="flex justify-between border rounded p-2"
                      >
                        <span>
                          {new Date(venda.data_venda).toLocaleString("pt-BR")}
                        </span>
                        <span>{venda.quantidade} unid.</span>
                        <span>R$ {venda.valor.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
