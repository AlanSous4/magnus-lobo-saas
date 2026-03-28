import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { POSInterface } from "@/components/pos-interface";

export default async function VendasPage() {
  const supabase = await createClient(); // ✅ Supabase client server-side

  // 🔹 Verifica usuário logado
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Redireciona para login se token expirou ou não houver usuário
  if (authError?.message?.includes("Refresh Token Not Found") || !user) {
    redirect("/login");
  }

  // 🔹 Busca apenas produtos ATIVOS e pertencentes ao USUÁRIO
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, value, quantity, image_url, active") // Adicionado 'active'
    .eq("user_id", user.id) // ✅ Segurança: apenas itens do dono
    .eq("active", true)      // ✅ Filtro: esconde os "deletados"
    .order("name");

  if (error) {
    console.error("Erro ao buscar produtos:", error);
  }

  return (
    <POSInterface
      products={products ?? []}
      userId={user.id}
    />
  );
}