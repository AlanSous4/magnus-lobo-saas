import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ✅ Usuário logado → fluxo normal do sistema
  if (user) {
    redirect("/dashboard")
  }

  // ✅ Usuário NÃO logado → HTML simples (bots conseguem ler)
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-2xl font-bold">
        Padaria Lanchonete Magnus Lobo
      </h1>

      <p className="text-muted-foreground max-w-md">
        Sistema completo de gestão de vendas, produtos, estoque e faturamento
        para padarias e lanchonetes.
      </p>

      {/* Link explícito para preview */}
      <Link
        href="/preview"
        className="text-orange-600 underline text-sm"
      >
        Ver apresentação do sistema
      </Link>
    </main>
  )
}