import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

const ORG_ID = '5e391366-d0a5-46fb-8311-f5e86833219d';

export function useMesas() {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMesas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('mesas')
        .select('*')
        .eq('organization_id', ORG_ID)
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
    fetchMesas();
    
    // Atualiza os dados automaticamente se o usuário trocar de aba e voltar
    // Essencial para manter o status de ocupação sincronizado
    window.addEventListener('focus', fetchMesas);
    return () => window.removeEventListener('focus', fetchMesas);
  }, [fetchMesas]);

  return { mesas, loading, refresh: fetchMesas };
}