import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClientContent } from "@/components/dashboard-client-content";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) redirect("/login");

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .is("deleted_at", null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: recentSales } = await supabase
    .from("sales")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", today.toISOString())
    .order("created_at", { ascending: false })
    .limit(5);

  // ✅ Formata o tempo no server (SSR-safe)
  const salesWithFormattedTime = (recentSales || []).map((sale) => ({
    ...sale,
    timeLabel: formatDistanceToNow(new Date(sale.created_at), {
      addSuffix: true,
      locale: ptBR,
    }),
  }));

  return (
    <DashboardClientContent
      userId={user.id}
      initialProducts={products || []}
      initialRecentSales={salesWithFormattedTime}
    />
  );
}