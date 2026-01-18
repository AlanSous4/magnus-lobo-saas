import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SalesHistory } from "@/components/sales-history"

type Props = {
  searchParams: Promise<{
    type?: "sales" | "revenue" | "ticket"
    groupBy?: "day" | "month"
  }>
}

export default async function SalesHistoryPage({ searchParams }: Props) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // ✅ OBRIGATÓRIO no Next 15+
  const params = await searchParams

  // 🔹 Parâmetros vindos do card ou filtros
  const type = params.type ?? "revenue"
  const groupBy = params.groupBy ?? "day"

  const { data: sales } = await supabase
    .from("sales")
    .select("id, total_amount, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Histórico de Vendas
        </h1>

        <p className="text-muted-foreground">
          Visualização por{" "}
          {type === "sales"
            ? "Quantidade de vendas"
            : type === "ticket"
            ? "Ticket médio"
            : "Receita"}
        </p>
      </div>

      {/* 🔹 Componente centralizado e reutilizável */}
      <SalesHistory
        sales={sales ?? []}
        type={type}
        groupBy={groupBy}
      />
    </div>
  )
}
