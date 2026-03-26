"use client"

import { useState, useEffect } from "react"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // Garante que o componente só mostre o estado real após carregar no navegador
  useEffect(() => {
    setMounted(true)
  }, [])

  // Enquanto o componente não "monta", renderizamos a versão padrão (Claro)
  // Isso evita o erro de Hydration no console.
  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="flex items-center gap-2">
        <Moon className="h-4 w-4" />
        Escuro
      </Button>
    )
  }

  const isDark = theme === "dark"

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center gap-2"
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4 text-yellow-500" />
          Claro
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-slate-700" />
          Escuro
        </>
      )}
    </Button>
  )
}