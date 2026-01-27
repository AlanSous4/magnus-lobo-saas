"use client"

import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

export function MobileMenuButton() {
  const openSidebar = () => {
    document.dispatchEvent(new Event("open-sidebar"))
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="lg:hidden"
      onClick={openSidebar}
    >
      <Menu className="h-6 w-6" />
    </Button>
  )
}
