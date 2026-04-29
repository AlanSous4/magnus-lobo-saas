import { createBrowserClient } from "@supabase/ssr";

// ✅ Instância única do Supabase com configurações de persistência reforçadas
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// ✅ Função para renovar sessão de forma segura (usa getUser que valida no servidor)
export async function refreshSessionSafely() {
  try {
    // getUser() sempre valida com o servidor, diferente de getSession()
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      // Tenta renovar o token
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        console.warn("Magnus Lobo: Sessão expirada, não foi possível renovar");
        return { valid: false, user: null };
      }
      
      return { valid: true, user: refreshData.user };
    }
    
    return { valid: true, user };
  } catch (e) {
    console.error("Magnus Lobo: Erro ao validar sessão:", e);
    return { valid: false, user: null };
  }
}
