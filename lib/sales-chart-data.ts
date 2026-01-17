import { createClient } from "@/lib/supabase/server"

type Period = "daily" | "monthly"

export async function getSalesChartData(
  userId: string,
  period: Period
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("sales")
    .select("total_amount, created_at")
    .eq("user_id", userId)

  if (error) {
    console.error(error)
    return []
  }

  const map = new Map<string, number>()

  data.forEach((sale) => {
    const date = new Date(sale.created_at)

    const key =
      period === "daily"
        ? date.toISOString().slice(0, 10) // YYYY-MM-DD
        : `${date.getFullYear()}-${date.getMonth() + 1}` // YYYY-MM

    map.set(key, (map.get(key) || 0) + Number(sale.total_amount))
  })

  return Array.from(map.entries()).map(([date, total]) => ({
    date,
    total,
  }))
}
