import type React from "react"
import { NavSidebar } from "@/components/nav-sidebar"
import { MobileMenuButton } from "@/components/mobile-menu-button"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <NavSidebar />

      <div className="flex-1 flex flex-col">
        {/* Header mobile */}
        <header className="flex items-center gap-2 border-b p-4 lg:hidden">
          <MobileMenuButton />
          <span className="font-semibold">Dashboard</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
