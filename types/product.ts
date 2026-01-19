export interface Product {
    id: string
    name: string
    value: number
    quantity: number
    expiration_date: string | null
    created_at: string
    image_url?: string | null
  }
  