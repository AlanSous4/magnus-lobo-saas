import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useMesas() {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState(null);
  
  // Usamos um Ref para controlar o canal e evitar múltiplas inscrições
  const channelRef = useRef(null);

  const fetchMesas = useCallback(async (idDaOrganizacao) => {
    if (!idDaOrganizacao) return;

    try {
      const { data, error } = await supabase
        .from('mesas')
        .select('*')
        .eq('organization_id', idDaOrganizacao)
        .order('numero_mesa', { ascending: true });

      if (error) throw error;
      setMesas(data || []);
    } catch (err) {
      console.error("Erro ao buscar mesas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true; // Controle para evitar atualizações em componentes desmontados

    async function inicializar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      const currentOrgId = profile?.organization_id;
      if (currentOrgId && active) {
        setOrgId(currentOrgId);
        fetchMesas(currentOrgId);

        // Se já existe um canal, removemos antes de criar outro
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }

        // 1. CRIAMOS o canal
        const newChannel = supabase.channel(`mesas-org-${currentOrgId}`);

        // 2. CONFIGURAMOS o callback ANTES do subscribe
        newChannel.on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'mesas', 
            filter: `organization_id=eq.${currentOrgId}` 
          },
          () => fetchMesas(currentOrgId)
        );

        // 3. AGORA chamamos o subscribe
        newChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log("Realtime conectado com sucesso");
          }
        });

        channelRef.current = newChannel;
      }
    }

    inicializar();

    return () => {
      active = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchMesas]);

  return { mesas, loading, refresh: () => fetchMesas(orgId) };
}