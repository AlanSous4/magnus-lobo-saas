import { createClient } from "@/lib/supabase/server";
import { SalesListClient } from "@/components/sales-list-client";

export default async function SalesHistoryPage() {
  const supabase = await createClient(); // 👈 AQUI ESTÁ A CORREÇÃO

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: sales, error } = await supabase
    .from("sales_view")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar vendas:", error);
  }

  return (
    <SalesListClient
      initialSales={sales ?? []}
      userId={user.id}
    />
  );
}
