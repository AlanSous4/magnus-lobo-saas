"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp, Package } from "lucide-react"

/* 🔸 Dados mockados (depois liga no Supabase) */
const produtos = [
  { nome: "Pão Francês", quantidade: 420 },
  { nome: "Coxinha", quantidade: 310 },
  { nome: "Pão de Queijo", quantidade: 260 },
  { nome: "Bolo de Chocolate", quantidade: 180 },
  { nome: "Refrigerante Lata", quantidade: 150 },
]

export default function ProdutosMaisVendidosPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Título */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">
          Produtos mais vendidos
        </h1>
        <p className="text-sm text-muted-foreground">
          Análise dos produtos com maior saída no período
        </p>
      </div>

      {/* Cards resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Produto líder
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">Pão Francês</p>
            <Badge className="mt-2 bg-orange-100 text-orange-900">
              420 vendidos
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
            <p className="text-2xl font-bold">
              1.320
            </p>
            <p className="text-xs text-muted-foreground">
              no período selecionado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between gap-4">
        <Select defaultValue="30">
          <SelectTrigger className="w-50">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline">
          Exportar relatório
        </Button>
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
              <Bar
                dataKey="quantidade"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {produtos.map((item, index) => (
              <div
                key={item.nome}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-orange-600">
                    #{index + 1}
                  </span>
                  <span className="font-medium">
                    {item.nome}
                  </span>
                </div>

                <Badge variant="secondary">
                  {item.quantidade} vendidos
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
