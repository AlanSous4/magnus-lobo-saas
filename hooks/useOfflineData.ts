import { useState, useEffect } from 'react';

export function useOfflineData<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Tenta buscar dados frescos do Supabase
        const freshData = await fetcher();
        if (freshData) {
          setData(freshData);
          // 2. Salva no LocalStorage para o futuro
          localStorage.setItem(`magnus_lobo_${key}`, JSON.stringify(freshData));
        }
      } catch (error) {
        console.warn(`Modo offline: Carregando ${key} do cache local.`);
        // 3. Se falhar (sem net), busca o que estiver guardado
        const saved = localStorage.getItem(`magnus_lobo_${key}`);
        if (saved) {
          setData(JSON.parse(saved));
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [key]);

  return { data, loading };
}