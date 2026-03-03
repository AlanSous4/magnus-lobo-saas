export type SaleItem = {
  id: string;
  sale_id: string;
  product_name: string;
  quantity: number;
  price: number;
  is_weight: boolean;
  total: number;
};

export type Sale = {
  id: string;
  user_id: string;
  created_at: string;
  total_value: number;
  payment_method: string | null;
  items: SaleItem[];
};