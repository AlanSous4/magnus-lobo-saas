"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuta mudanças na autenticação em tempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setLoading(false);
      }
      
      if (!session && event === "SIGNED_OUT") {
        router.push("/login");
      }
    });

    // Verificação inicial
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        setLoading(false);
      }
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Se estiver carregando a sessão, não mostra nada (ou um spinner) para evitar flashes
  if (loading) return null;

  return <>{children}</>;
}