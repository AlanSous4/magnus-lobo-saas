"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ShoppingBag, LayoutDashboard, Package, ShoppingCart, LogOut, User } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Vendas (PDV)",
    href: "/vendas",
    icon: ShoppingCart,
  },
  {
    title: "Produtos",
    href: "/produtos",
    icon: Package,
  },
]

export function NavSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [username, setUsername] = useState<string>("")

  useEffect(() => {
    const fetchUserProfile = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single()

        if (profile) {
          setUsername(profile.username)
        }
      }
    }

    fetchUserProfile()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="border-b p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-orange-500 to-amber-600">
            <ShoppingBag className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold leading-tight">Magnus Lobo</h2>
            <p className="text-xs text-muted-foreground">Padaria</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Button
              key={item.href}
              asChild
              variant={isActive ? "secondary" : "ghost"}
              className={cn("w-full justify-start", isActive && "bg-orange-100 text-orange-900 hover:bg-orange-100")}
            >
              <Link href={item.href}>
                <Icon className="mr-2 h-4 w-4" />
                {item.title}
              </Link>
            </Button>
          )
        })}
      </nav>

      <div className="border-t p-4 space-y-2">
        {username && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50">
            <User className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">{username}</span>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  )
}
