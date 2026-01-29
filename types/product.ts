export interface Product {
  id: string
  name: string

  // Preço:
  // - unit  → preço por unidade
  // - weight → preço por 100g
  value: number

  // Estoque:
  // - unit  → unidades
  // - weight → gramas
  quantity: number

  // 🔥 NOVOS CAMPOS (não quebram nada)
  type?: "unit" | "weight"        // padrão: unit
  weight_step?: number            // ex: 50 = de 50 em 50g (opcional)

  expiration_date: string | null
  created_at: string
  image_url?: string | null
}
