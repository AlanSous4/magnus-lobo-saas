"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { SalesHistory } from "@/components/sales-history";

function RelatorioVendasContent() {
  const searchParams = useSearchParams();

  const type =
    (searchParams.get("type") as "sales" | "revenue" | "ticket") ?? "sales";

  const [userId, setUserId] = useState<string | null>(null);

  // 🔹 Carrega usuário
  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
      }
    }

    loadUser();
  }, []);

  if (!userId) {
    return (
      <p className="text-sm text-muted-foreground">
        Carregando usuário...
      </p>
    );
  }

  return (
    <SalesHistory
      type={type}
      groupBy="day"
      userId={userId}
    />
  );
}

export default function RelatorioVendasClient() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">
          Carregando relatório...
        </p>
      }
    >
      <RelatorioVendasContent />
    </Suspense>
  );
}