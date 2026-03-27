'use client'; 

import RecebimentoFiscal from '@/components/RecebimentoFiscal';

export default function RecebimentoPage() {
  // Esse é o ID da sua padaria que você me passou
  const idDaMinhaPadaria = "5e391366-d0a5-46fb-8311-f5e86833219d";

  return (
    <main className="min-h-screen">
      {/* O componente recebe o ID através da propriedade organizationId */}
      <RecebimentoFiscal organizationId={idDaMinhaPadaria} />
    </main>
  );
}