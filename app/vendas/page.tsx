import { createClient } from "@/lib/supabase/server";
import { POSInterface } from "@/components/pos-interface";

export default async function VendasPage() {
  const supabase = await createClient(); // ✅ CORREÇÃO AQUI

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, value, quantity, image_url")
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
