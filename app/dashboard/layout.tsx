import type React from "react"
import { NavSidebar } from "@/components/nav-sidebar"
import { MobileMenuButton } from "@/components/mobile-menu-button"
import { SupabaseSessionProvider } from "@/components/supabase-session-provider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SupabaseSessionProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">

        {/* MENU LATERAL FIXO */}
        <div className="h-full border-r border-border bg-sidebar shrink-0">
          <NavSidebar />
        </div>

        <div className="flex-1 flex flex-col h-full min-w-0">

          {/* Header mobile */}
          <header className="flex items-center gap-2 border-b border-border p-4 lg:hidden bg-card/50 backdrop-blur-md">
            <MobileMenuButton />
            <span className="font-semibold">Dashboard</span>
          </header>

          {/* SCROLL APENAS NO CONTEÚDO */}
          {/* Ajustei o padding lateral aqui também (px-2 md:px-4) */}
          <main className="flex-1 overflow-y-auto px-2 py-4 md:px-4 md:py-6 lg:p-6">
            
            {/* 🔹 ALTERAÇÕES PARA PUXAR PARA A ESQUERDA:
              - Removi 'mx-auto' (que centralizava).
              - Mudei 'max-w-7xl' para 'max-w-full' (para usar a largura toda).
              - Se quiser uma largura grande mas não total, use 'max-w-[1600px]'.
            */}
            <div className="max-w-full ml-0">
              {children}
            </div>
          </main>

        </div>

      </div>
    </SupabaseSessionProvider>
  )
}
