import { createClient } from "@/lib/supabase/server"

export async function getDashboardMetrics(userId: string) {
  // ✅ CORREÇÃO: createClient é async
  const supabase = await createClient()

  // Data de 30 dias atrás
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const since = thirtyDaysAgo.toISOString()

  // Buscar métricas em paralelo (mais performático)
  const [
    { count: productsCount },
    { data: sales },
    { count: salesCount },
  ] = await Promise.all([
    // Total de produtos cadastrados
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),

    // Vendas (últimos 30 dias) – usado para receita
    supabase
      .from("sales")
      .select("total_amount")
      .eq("user_id", userId)
      .gte("created_at", since),

    // Quantidade de vendas (últimos 30 dias)
    supabase
      .from("sales")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since),
  ])

  // Receita total no período
  const revenue =
    sales?.reduce((acc, sale) => acc + Number(sale.total_amount), 0) ?? 0

  // Ticket médio
  const averageTicket =
    salesCount && salesCount > 0 ? revenue / salesCount : 0

  return {
    productsCount: productsCount ?? 0,
    salesCount: salesCount ?? 0,
    revenue,
    averageTicket,
  }
}
