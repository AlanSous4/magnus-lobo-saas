"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  ShoppingBag,
  LayoutDashboard,
  Package,
  ShoppingCart,
  LogOut,
  User,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Vendas (PDV)", href: "/vendas", icon: ShoppingCart },
  { title: "Produtos", href: "/produtos", icon: Package },
]

export function NavSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [username, setUsername] = useState<string>("")
  const [mobileOpen, setMobileOpen] = useState(false)

  // 🔗 Escuta o botão ☰ do header (DashboardLayout)
  useEffect(() => {
    const openSidebar = () => setMobileOpen(true)

    document.addEventListener("open-sidebar", openSidebar)

    return () => {
      document.removeEventListener("open-sidebar", openSidebar)
    }
  }, [])

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .single()

          if (!error && profile) {
            setUsername(profile.username)
          }
        }
      } catch (err) {
        console.error("Erro ao buscar usuário:", err)
      }
    }

    fetchUserProfile()
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/login")
    } catch (err) {
      console.error("Erro ao sair:", err)
    }
  }

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed z-50 flex h-screen w-64 flex-col border-r bg-background transition-transform",
          "lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header mobile */}
        <div className="flex items-center justify-between border-b p-4 lg:hidden">
          <span className="font-semibold">Menu</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Logo */}
        <div className="border-b p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-orange-500 to-amber-600">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold leading-tight">Magnus Lobo</h2>
              <p className="text-xs text-muted-foreground">
                Padaria Lanchonete
              </p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Button
                key={item.href}
                asChild
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive &&
                    "bg-orange-100 text-orange-900 hover:bg-orange-100"
                )}
              >
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Link>
              </Button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-4 space-y-2">
          {username && (
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2">
              <User className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">
                {username}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>
    </>
  )
}
