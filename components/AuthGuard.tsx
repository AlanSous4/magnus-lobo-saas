"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, refreshSessionSafely } from "@/lib/supabase/client";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isRedirecting = false;

    // Escuta mudanças na autenticação em tempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setLoading(false);
      }
      
      if (!session && event === "SIGNED_OUT" && !isRedirecting) {
        isRedirecting = true;
        router.push("/login");
      }

      if (event === "TOKEN_REFRESHED") {
        console.log("Magnus Lobo: Token renovado com sucesso (AuthGuard)");
      }
    });

    // ✅ Verificação inicial usando getUser() que valida no servidor
    const checkSession = async () => {
      const { valid } = await refreshSessionSafely();
      if (!valid && !isRedirecting) {
        isRedirecting = true;
        router.push("/login");
      } else {
        setLoading(false);
      }
    };

    checkSession();

    // ✅ CRÍTICO: Renova a sessão quando a página recupera o foco
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const { valid } = await refreshSessionSafely();
        if (!valid && !isRedirecting) {
          isRedirecting = true;
          console.warn("Magnus Lobo: Sessao expirada apos retorno do foco");
          router.push("/login");
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);

  // Se estiver carregando a sessão, não mostra nada (ou um spinner) para evitar flashes
  if (loading) return null;

  return <>{children}</>;
}
