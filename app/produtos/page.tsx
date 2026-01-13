import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProductList } from "@/components/product-list"
import { AddProductDialog } from "@/components/add-product-dialog"
import { Package } from "lucide-react"

export default async function ProductsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Buscar produtos do usuário
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur + supports-backdrop-filter:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-orange-600" />
            <h1 className="text-xl font-semibold">Gestão de Produtos</h1>
          </div>
          <AddProductDialog userId={user.id} />
        </div>
      </header>
      <main className="flex-1 container px-4 py-6">
        <ProductList products={products || []} />
      </main>
    </div>
  )
}
