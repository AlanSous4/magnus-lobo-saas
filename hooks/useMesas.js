import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

const ORG_ID = '5e391366-d0a5-46fb-8311-f5e86833219d';

export function useMesas() {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMesas = useCallback(async () => {
    // Retiramos o setLoading(true) daqui para não dar "piscada" no refresh
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .eq('organization_id', ORG_ID)
      .order('numero_mesa', { ascending: true });

    if (!error) setMesas(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMesas();
    
    // Opcional: Atualiza os dados automaticamente se você mudar de aba e voltar
    window.addEventListener('focus', fetchMesas);
    return () => window.removeEventListener('focus', fetchMesas);
  }, [fetchMesas]);

  return { mesas, loading, refresh: fetchMesas };
}