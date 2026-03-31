import React from 'react';

const MesaCard = ({ mesa, onClick }) => {
  // Lógica rigorosa para definir o status visual
  const isOcupada = mesa.status === 'ocupada';
  
  const statusStyles = isOcupada 
    ? "bg-red-50 border-red-200 text-red-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]" 
    : "bg-white border-stone-200 text-stone-800 hover:border-orange-400 hover:shadow-lg shadow-sm";

  return (
    <div 
      onClick={() => onClick(mesa)}
      className={`
        ${statusStyles}
        relative flex flex-col items-center justify-center 
        p-8 rounded-3xl border-2 cursor-pointer 
        transition-all duration-300 active:scale-90
        w-full aspect-square
      `}
    >
      {/* Indicador tipo LED de status */}
      <div className={`
        absolute top-4 right-4 h-4 w-4 rounded-full border-2 border-white shadow-sm
        ${isOcupada ? 'bg-red-500 animate-pulse' : 'bg-green-500'}
      `} />

      <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
        Mesa
      </span>
      
      <span className="text-5xl font-black my-2 italic">
        {mesa.numero_mesa}
      </span>

      <div className={`mt-2 text-[10px] font-black px-4 py-1.5 rounded-full border-2 tracking-tighter ${
        isOcupada 
          ? 'bg-red-600 border-red-700 text-white' 
          : 'bg-stone-50 border-stone-100 text-stone-400'
      }`}>
        {isOcupada ? 'OCUPADA' : 'LIVRE'}
      </div>
    </div>
  );
};

export default MesaCard;