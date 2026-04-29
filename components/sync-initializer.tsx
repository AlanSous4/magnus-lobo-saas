"use client";

import { useEffect, useRef } from "react";
import { SyncQueue } from "@/lib/sync-queue";
import { supabase, refreshSessionSafely } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SyncInitializer() {
  const router = useRouter();
  const isRestoring = useRef(false);

  useEffect(() => {
    const restoreOfflineSession = async () => {
      if (isRestoring.current) return;
      
      const cached = localStorage.getItem("magnus_lobo_session");
      if (cached && !navigator.onLine) {
        isRestoring.current = true;
        try {
          const { access_token, refresh_token } = JSON.parse(cached);
          await supabase.auth.setSession({ access_token, refresh_token });
          console.log("🔄 Magnus Lobo: Sessão recuperada do cache (Modo Offline).");
        } catch (e) {
          console.warn("⚠️ Magnus Lobo: Falha ao ler cache de sessão:", e);
        } finally {
          isRestoring.current = false;
        }
      }
    };

    restoreOfflineSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" && !navigator.onLine) {
        console.warn("🔒 Magnus Lobo: Tentativa de logout bloqueada - Dispositivo Offline.");
        const cached = localStorage.getItem("magnus_lobo_session");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            await supabase.auth.setSession(parsed);
          } catch (err) {
            console.error("Erro ao reter sessão offline:", err);
          }
        }
        return;
      }

      if (session) {
        localStorage.setItem("magnus_lobo_session", JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }));
        
        // ✨ ADICIONADO: Garante que o OrgID esteja sempre no localStorage para a SyncQueue
        if (session.user?.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("organization_id")
            .eq("id", session.user.id)
            .single();
          
          if (profile?.organization_id) {
            localStorage.setItem("magnus_lobo_org_id", profile.organization_id);
          }
        }
      }

      if (event === "SIGNED_OUT" && navigator.onLine) {
        localStorage.removeItem("magnus_lobo_session");
        localStorage.removeItem("magnus_lobo_org_id"); // Limpa org também
        router.push("/login");
      }
    });

    const handleOnline = async () => {
      console.log("Magnus Lobo: Conexao restabelecida. Validando e sincronizando...");
      
      const { valid } = await refreshSessionSafely();
      
      if (valid) {
        SyncQueue.sync(); 
      } else {
        router.push("/login");
      }
    };

    // ✅ CRÍTICO: Renova a sessão quando a página/aba recupera o foco
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        console.log("Magnus Lobo: Aba em foco - renovando sessao...");
        const { valid } = await refreshSessionSafely();
        if (!valid) {
          console.warn("Magnus Lobo: Sessao invalida apos retorno do foco");
          router.push("/login");
        }
      }
    };

    // ✅ Renovação periódica da sessão (a cada 5 minutos)
    const refreshInterval = setInterval(async () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        console.log("Magnus Lobo: Renovacao periodica da sessao...");
        await refreshSessionSafely();
      }
    }, 5 * 60 * 1000); // 5 minutos

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (navigator.onLine) {
      SyncQueue.sync();
    }

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(refreshInterval);
    };
  }, [router]);

  return null;
}
