import { createBrowserClient } from "@supabase/ssr";

// ✅ Instância única do Supabase para toda a aplicação
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
