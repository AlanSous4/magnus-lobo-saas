import type React from "react"
import { NavSidebar } from "@/components/nav-sidebar"
import { SupabaseSessionProvider } from "@/components/supabase-session-provider"

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SupabaseSessionProvider>
      <div className="flex h-screen">
        <NavSidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </SupabaseSessionProvider>
  )
}
