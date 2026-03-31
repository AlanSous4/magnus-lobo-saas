'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMesas } from '@/hooks/useMesas';
import MesaCard from '@/components/mesas/MesaCard';

export default function MesasPage() {
  const { mesas, loading, refresh } = useMesas();
  const router = useRouter();

  // Força atualização total ao entrar na página para garantir status real
  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-stone-400 font-black animate-pulse uppercase tracking-tighter">
          Sincronizando Salão...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-stone-900 uppercase italic">Salão</h1>
          <p className="text-stone-500 font-medium">Gerenciamento de pedidos em tempo real</p>
        </div>
        
        <button 
          onClick={refresh} 
          className="text-[10px] font-black text-orange-600 bg-orange-50 px-4 py-2 rounded-xl border border-orange-200 hover:bg-orange-100 transition-colors uppercase"
        >
          Atualizar Agora
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {mesas.map((mesa) => (
          <MesaCard 
            key={mesa.id} 
            mesa={mesa} 
            onClick={(m) => router.push(`/dashboard/mesas/${m.id}`)} 
          />
        ))}
      </div>
      
      {mesas.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-stone-100 rounded-3xl">
          <p className="text-stone-300 font-bold italic uppercase">Nenhuma mesa configurada.</p>
        </div>
      )}
    </div>
  );
}