'use client'; // Obrigatório no Next.js para usar o scanner (interação do usuário)

import RecebimentoFiscal from '@/components/RecebimentoFiscal';

export default function RecebimentoPage() {
  return (
    <main className="min-height-screen">
      <RecebimentoFiscal />
    </main>
  );
}