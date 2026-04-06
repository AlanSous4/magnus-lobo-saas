export interface Product {
  id: string
  name: string

  // Preço e Estoque
  value: number
  quantity: number

  // 💡 ADICIONE ESTA LINHA PARA SUMIR O ERRO:
  is_weight: boolean 

  // Seus campos novos
  type?: "unit" | "weight"
  weight_step?: number

  expiration_date: string | null
  created_at: string
  image_url?: string | null

  // Campos de controle
  active: boolean
  deleted_at?: string | null
  user_id: string
  organization_id?: string
}