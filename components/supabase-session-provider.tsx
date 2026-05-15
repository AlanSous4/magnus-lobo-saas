"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase, refreshSupabaseSession } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface SessionContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshSession: () => Promise<boolean>;
}

const SessionContext = createContext<SessionContextType>({
  isAuthenticated: false,
  isLoading: true,
  refreshSession: async () => false,
});

export function useSession() {
  return useContext(SessionContext);
}

interface Props {
  children: ReactNode;
}

export function SupabaseSessionProvider({ children }: Props) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Função que força a atualização da sessão e re-sincroniza com o servidor
  const handleRefreshSession = useCallback(async () => {
    const isValid = await refreshSupabaseSession();
    setIsAuthenticated(isValid);
    
    if (!isValid) {
      router.push("/login");
    }
    
    return isValid;
  }, [router]);

  useEffect(() => {
    // Escuta mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setIsAuthenticated(true);
        setIsLoading(false);
      }
      
      if (event === "SIGNED_OUT") {
        setIsAuthenticated(false);
        router.push("/login");
      }
      
      if (event === "TOKEN_REFRESHED") {
        setIsAuthenticated(!!session);
      }
    });

    // Verificação inicial
    const initSession = async () => {
      const isValid = await refreshSupabaseSession();
      setIsAuthenticated(isValid);
      setIsLoading(false);
    };

    initSession();

    // Renova a sessão quando o usuário volta para a aba/janela
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        const isValid = await handleRefreshSession();
        // Força um re-render dos componentes filhos para atualizar dados
        if (isValid) {
          // Dispara um evento customizado para que hooks possam reagir
          window.dispatchEvent(new CustomEvent("supabase-session-restored"));
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router, handleRefreshSession]);

  return (
    <SessionContext.Provider value={{ isAuthenticated, isLoading, refreshSession: handleRefreshSession }}>
      {children}
    </SessionContext.Provider>
  );
}
