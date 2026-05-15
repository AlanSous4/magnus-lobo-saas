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
    },
  }
);

// 🔄 Função para forçar a sincronização da sessão quando o usuário volta à página
export async function refreshSupabaseSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    // Se não há sessão válida, tenta recuperar via getUser (mais rigoroso)
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  }
  
  return !!session;
}
