import type React from "react"
import { NavSidebar } from "@/components/nav-sidebar"
import { MobileMenuButton } from "@/components/mobile-menu-button"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (

    <div className="flex h-screen overflow-hidden">

      {/* MENU LATERAL FIXO */}
      <div className="h-full">
        <NavSidebar />
      </div>

      <div className="flex-1 flex flex-col h-full">

        {/* Header mobile */}
        <header className="flex items-center gap-2 border-b p-4 lg:hidden">
          <MobileMenuButton />
          <span className="font-semibold">Dashboard</span>
        </header>

        {/* SCROLL APENAS NO CONTEÚDO */}
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>

      </div>

    </div>

  )
}