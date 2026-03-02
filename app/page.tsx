import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ⛔ NÃO redireciona imediatamente
  if (!user) {
    return (
      <main>
        <h1>Padaria Lanchonete Magnus Lobo</h1>
        <p>Sistema de gestão de vendas e estoque</p>
      </main>
    )
  }

  redirect("/dashboard")
}