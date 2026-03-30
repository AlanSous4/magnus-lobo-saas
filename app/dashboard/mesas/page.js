'use client';
import { useRouter } from 'next/navigation';
import { useMesas } from '@/hooks/useMesas';
import MesaCard from '@/components/mesas/MesaCard';

export default function MesasPage() {
  const { mesas, loading } = useMesas();
  const router = useRouter();

  if (loading) return <div className="p-8 text-stone-500 text-center">Carregando mesas...</div>;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900">Salão</h1>
        <p className="text-stone-500">Gerenciamento de pedidos por mesa</p>
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
        <p className="text-center text-stone-400 mt-10">Nenhuma mesa cadastrada para esta organização.</p>
      )}
    </div>
  );
}