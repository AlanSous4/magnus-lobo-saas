import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ✅ Usuário logado → dashboard (comportamento normal)
  if (user) {
    redirect("/dashboard")
  }

  // ✅ Usuário NÃO logado
  // 🔥 Importante: renderiza HTML para bots
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">
          Padaria Lanchonete Magnus Lobo
        </h1>

        <p className="text-muted-foreground">
          Sistema completo de gestão de vendas, estoque e faturamento
          para padarias e lanchonetes.
        </p>
      </div>
    </main>
  )
}