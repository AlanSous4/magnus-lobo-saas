import type React from "react"
import { NavSidebar } from "@/components/nav-sidebar"
import { MobileMenuButton } from "@/components/mobile-menu-button"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    /* bg-background: Aplica o fundo (oklch 0.12...) definido no seu CSS.
      text-foreground: Garante que o texto fique claro no modo escuro.
      transition-colors: Faz a transição entre temas ser suave (0.3s).
    */
    <div className="flex h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">

      {/* MENU LATERAL FIXO */}
      <div className="h-full border-r border-border bg-sidebar shrink-0">
        <NavSidebar />
      </div>

      <div className="flex-1 flex flex-col h-full min-w-0">

        {/* Header mobile - Ajustado com bg-card e borda dinâmica */}
        <header className="flex items-center gap-2 border-b border-border p-4 lg:hidden bg-card/50 backdrop-blur-md">
          <MobileMenuButton />
          <span className="font-semibold">Dashboard</span>
        </header>

        {/* SCROLL APENAS NO CONTEÚDO */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

      </div>

    </div>
  )
}