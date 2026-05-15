import { createBrowserClient } from "@supabase/ssr";

// ✅ Instância única do Supabase com configurações de persistência reforçadas
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,       // Garante que a sessão fique salva no navegador
      autoRefreshToken: true,     // Tenta renovar o token sozinho antes de expirar
      detectSessionInUrl: true,   // Ajuda na detecção do login após redirecionamentos
      flowType: "pkce",           // Usa PKCE para maior segurança na renovação de tokens
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      storageKey: "magnus-lobo-auth", // Chave consistente para evitar conflitos
    },
  }
);
