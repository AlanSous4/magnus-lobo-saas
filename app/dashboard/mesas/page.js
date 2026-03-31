'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMesas } from '@/hooks/useMesas';
import MesaCard from '@/components/mesas/MesaCard';

export default function MesasPage() {
  const { mesas, loading, refresh } = useMesas();
  const router = useRouter();

  // Força um refresh sempre que a página carregar
  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) return <div className="p-8 text-stone-500 text-center font-bold">Carregando salão...</div>;

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-stone-900">Salão</h1>
          <p className="text-stone-500">Gerenciamento de pedidos por mesa</p>
        </div>
        {/* Botão de atualização manual para o usuário */}
        <button onClick={refresh} className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
          ATUALIZAR STATUS
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {mesas.map((mesa) => (
          <MesaCard 
            key={mesa.id} 
            mesa={mesa} 
            onClick={(m) => router.push(`/dashboard/mesas/${m.id}`)} 
          />
        ))}
      </div>
      
      {mesas.length === 0 && (
        <p className="text-center text-stone-400 mt-10">Nenhuma mesa cadastrada.</p>
      )}
    </div>
  );
}