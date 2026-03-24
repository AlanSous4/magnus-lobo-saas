"use client";

import type { ButtonHTMLAttributes } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

// 🔹 Agora o componente aceita className e outras props de <button>
type MobileMenuButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function MobileMenuButton({ className, ...props }: MobileMenuButtonProps) {
  const openSidebar = () => {
    document.dispatchEvent(new Event("open-sidebar"));
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={openSidebar}
      {...props}
    >
      <Menu className="h-6 w-6" />
    </Button>
  );
}
