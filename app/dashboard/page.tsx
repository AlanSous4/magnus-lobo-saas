import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClientContent } from "@/components/dashboard-client-content";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user || error) redirect("/login");

  const { data: products } = await supabase.from("products").select("*").eq("user_id", user.id);
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const { data: recentSales } = await supabase
    .from("sales")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", today.toISOString())
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <DashboardClientContent 
      userId={user.id} 
      initialProducts={products || []} 
      initialRecentSales={recentSales || []} 
    />
  );
}