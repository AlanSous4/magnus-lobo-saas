import { createClient } from "@/lib/supabase/server"
import { SalesListClient } from "@/components/sales-list-client"

export default async function SalesHistoryPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    // Você pode redirecionar ou renderizar um fallback aqui
    return null
  }

  const { data: sales, error } = await supabase
    .from("sales") // ✅ usar a tabela existente
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    // Loga o erro, mas mantém a página funcional
    console.error("Erro ao buscar vendas:", error)
  }

  return (
    <SalesListClient
      initialSales={sales ?? []}
      userId={user.id}
    />
  )
}
