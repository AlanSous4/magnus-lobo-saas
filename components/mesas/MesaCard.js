import React from 'react';

// Recebemos a mesa e uma função de clique como props
const MesaCard = ({ mesa, onClick }) => {
  
  // Definimos as cores baseadas no status da mesa
  const isOcupada = mesa.status === 'ocupada';
  
  const statusStyles = isOcupada 
    ? "bg-red-50 border-red-200 text-red-800 shadow-sm" 
    : "bg-stone-50 border-stone-200 text-stone-800 hover:border-orange-300 hover:bg-orange-50";

  return (
    <div 
      onClick={() => onClick(mesa)}
      className={`
        ${statusStyles}
        relative flex flex-col items-center justify-center 
        p-6 rounded-2xl border-2 cursor-pointer 
        transition-all duration-200 active:scale-95
        min-h-35 w-full
      `}
    >
      {/* Indicador visual de status no topo */}
      <div className={`
        absolute top-3 right-3 h-3 w-3 rounded-full 
        ${isOcupada ? 'bg-red-500 animate-pulse' : 'bg-green-500'}
      `} />

      <span className="text-sm font-medium opacity-70 uppercase tracking-wider">
        Mesa
      </span>
      
      <span className="text-4xl font-black my-1">
        {mesa.numero_mesa}
      </span>

      <div className="mt-2 text-xs font-semibold px-3 py-1 rounded-full bg-white/50 border border-current/10">
        {isOcupada ? 'EM CONSUMO' : 'DISPONÍVEL'}
      </div>

      {/* Se estiver ocupada, poderíamos mostrar um ícone ou valor prévio aqui no futuro */}
    </div>
  );
};

export default MesaCard;