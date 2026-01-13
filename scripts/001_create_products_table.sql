-- Tabela de produtos
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  expiration_date DATE,
  entry_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  exit_date TIMESTAMP WITH TIME ZONE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - permitir acesso apenas ao próprio usuário
CREATE POLICY "products_select_own"
  ON public.products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "products_insert_own"
  ON public.products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "products_update_own"
  ON public.products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "products_delete_own"
  ON public.products FOR DELETE
  USING (auth.uid() = user_id);

-- Índices para melhorar performance
CREATE INDEX idx_products_user_id ON public.products(user_id);
CREATE INDEX idx_products_expiration_date ON public.products(expiration_date);
