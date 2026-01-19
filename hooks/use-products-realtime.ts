"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export function useProductsRealtime(onChange: () => void) {
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("products-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          onChange()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onChange])
}
