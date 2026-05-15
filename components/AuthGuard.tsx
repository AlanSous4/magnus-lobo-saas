"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Função para verificar e renovar a sessão
  const refreshSession = useCallback(async () => {
    try {
      // Usa getUser() que valida o token com o servidor (mais seguro que getSession)
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.warn("[AuthGuard] Sessão inválida ou expirada, redirecionando para login");
        router.push("/login");
        return false;
      }
      
      return true;
    } catch (err) {
      console.error("[AuthGuard] Erro ao verificar sessão:", err);
      return false;
    }
  }, [router]);

  useEffect(() => {
    // Escuta mudanças na autenticação em tempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setLoading(false);
      }
      
      if (event === "TOKEN_REFRESHED") {
        console.log("[AuthGuard] Token renovado automaticamente");
      }
      
      if (!session && (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED")) {
        router.push("/login");
      }
    });

    // Verificação inicial usando getUser (validação server-side)
    const checkSession = async () => {
      const isValid = await refreshSession();
      if (isValid) {
        setLoading(false);
      }
    };

    checkSession();

    // Renova a sessão quando o usuário volta para a aba/janela
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("[AuthGuard] Aba ativa - verificando sessão");
        refreshSession();
      }
    };

    // Renova a sessão quando o usuário volta de outra página (popstate)
    const handleFocus = () => {
      console.log("[AuthGuard] Janela em foco - verificando sessão");
      refreshSession();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [router, refreshSession]);

  // Se estiver carregando a sessão, não mostra nada (ou um spinner) para evitar flashes
  if (loading) return null;

  return <>{children}</>;
}
