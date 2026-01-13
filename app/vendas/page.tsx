import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { POSInterface } from "@/components/pos-interface"

export default async function SalesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Buscar produtos disponíveis
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", user.id)
    .gt("quantity", 0)
    .order("name")

  return <POSInterface products={products || []} userId={user.id} />
}
