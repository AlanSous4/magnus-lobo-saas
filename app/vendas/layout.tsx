import type React from "react"
import { SupabaseSessionProvider } from "@/components/supabase-session-provider"

export default function SalesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SupabaseSessionProvider>
      <main className="h-screen">{children}</main>
    </SupabaseSessionProvider>
  )
}
