"use client";

import { useEffect, useRef } from "react";
import { SyncQueue } from "@/lib/sync-queue";
import { supabase } from "@/lib/supabase/client";
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
      console.log("🌐 Magnus Lobo: Conexão restabelecida. Validando e sincronizando...");
      
      const { data } = await supabase.auth.refreshSession();
      
      if (data.session) {
        // Usa o método correto da sua lib (sync ou processQueue)
        SyncQueue.sync(); 
      } else {
        router.push("/login");
      }
    };

    window.addEventListener("online", handleOnline);

    if (navigator.onLine) {
      SyncQueue.sync();
    }

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("online", handleOnline);
    };
  }, [router]);

  return null;
}