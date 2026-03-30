import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client'; // Ajuste o caminho do seu cliente supabase

const ORG_ID = '5e391366-d0a5-46fb-8311-f5e86833219d';

export function useMesas() {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMesas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .eq('organization_id', ORG_ID)
      .order('numero_mesa', { ascending: true });

    if (!error) setMesas(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMesas();
  }, []);

  return { mesas, loading, refresh: fetchMesas };
}