"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { useProductsRealtime } from "@/hooks/use-products-realtime"

export function ProductsRealtimeListener() {
  const router = useRouter()

  const handleChange = useCallback(() => {
    router.refresh()
  }, [router])

  useProductsRealtime(handleChange)

  return null
}
