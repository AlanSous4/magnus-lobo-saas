"use client"

import { supabase } from "@/lib/supabase/client"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  const handleLogout = async () => {
    await supabase.auth.signOut()
    // FIX: usar window.location.href para garantir limpeza completa da sessão
    window.location.href = "/login"
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 text-stone-500 hover:text-red-600 transition-colors cursor-pointer px-3 py-2 rounded-md hover:bg-red-50"
    >
      <LogOut className="h-4 w-4" />
      <span className="text-sm font-medium">Sair</span>
    </button>
  )
}
