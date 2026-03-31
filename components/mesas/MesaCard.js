import React from 'react';

const MesaCard = ({ mesa, onClick }) => {
  // Lógica para definir se está ocupada
  const isOcupada = mesa.status === 'ocupada';
  
  const statusStyles = isOcupada 
    ? "bg-red-50 border-red-200 text-red-800 shadow-inner" 
    : "bg-white border-stone-200 text-stone-800 hover:border-orange-300 hover:bg-orange-50 shadow-sm";

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
      {/* Indicador visual de status */}
      <div className={`
        absolute top-3 right-3 h-3 w-3 rounded-full border border-white
        ${isOcupada ? 'bg-red-500 animate-pulse' : 'bg-green-500'}
      `} />

      <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">
        Mesa
      </span>
      
      <span className="text-4xl font-black my-1">
        {mesa.numero_mesa}
      </span>

      <div className={`mt-2 text-[10px] font-black px-3 py-1 rounded-full border ${
        isOcupada ? 'bg-red-100 border-red-200' : 'bg-stone-100 border-stone-200'
      }`}>
        {isOcupada ? 'OCUPADA' : 'LIVRE'}
      </div>
    </div>
  );
};


export default MesaCard;