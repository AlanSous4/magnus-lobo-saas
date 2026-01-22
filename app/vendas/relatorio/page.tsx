import { Suspense } from "react";
import RelatorioVendasClient from "./relatorio-client";

export default function RelatorioVendasPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">
          Carregando relatório...
        </p>
      }
    >
      <RelatorioVendasClient />
    </Suspense>
  );
}
