export type Sale = {
    id: string;
    user_id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    total_value: number | null; // 👈 importante
    image_url?: string | null;
    created_at: string;
  };
  