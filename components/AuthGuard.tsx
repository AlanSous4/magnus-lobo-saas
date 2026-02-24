    "use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!data.session || error) {
        console.log("Token expirado ou inválido, redirecionando...");
        router.push("/login");
      }
    };

    checkSession();
  }, [router]);

  return <>{children}</>;
}