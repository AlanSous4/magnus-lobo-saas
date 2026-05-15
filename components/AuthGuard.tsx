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

  // Função para verificar a sessão
  const checkSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
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
      
      if (event === "SIGNED_OUT" || (!session && event === "TOKEN_REFRESHED")) {
        router.push("/login");
      }
    });

    // Verificação inicial
    const initSession = async () => {
      const isValid = await checkSession();
      if (isValid) {
        setLoading(false);
      }
    };

    initSession();

    // Renova a sessão quando o usuário volta para a aba/janela
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router, checkSession]);

  // Se estiver carregando a sessão, não mostra nada (ou um spinner) para evitar flashes
  if (loading) return null;

  return <>{children}</>;
}
