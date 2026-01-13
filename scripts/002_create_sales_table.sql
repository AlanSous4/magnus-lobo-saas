-- Tabela de vendas
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('credit', 'debit', 'vr', 'va', 'cash')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "sales_select_own"
  ON public.sales FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "sales_insert_own"
  ON public.sales FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Índices
CREATE INDEX idx_sales_user_id ON public.sales(user_id);
CREATE INDEX idx_sales_created_at ON public.sales(created_at);
