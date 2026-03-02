"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { SalesHistory } from "@/components/sales-history";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Period = "today" | "30" | "60" | "90" | "custom";

function RelatorioVendasContent() {
  const searchParams = useSearchParams();

  const type =
    (searchParams.get("type") as "sales" | "revenue" | "ticket") ?? "sales";

  const [userId, setUserId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("30");
  const [selectedDate, setSelectedDate] = useState<string>("");

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
    <div className="space-y-6">
      {/* 🔹 Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          variant={period === "today" ? "default" : "outline"}
          onClick={() => setPeriod("today")}
        >
          Diário
        </Button>

        <Button
          variant={period === "30" ? "default" : "outline"}
          onClick={() => setPeriod("30")}
        >
          30 dias
        </Button>

        <Button
          variant={period === "60" ? "default" : "outline"}
          onClick={() => setPeriod("60")}
        >
          60 dias
        </Button>

        <Button
          variant={period === "90" ? "default" : "outline"}
          onClick={() => setPeriod("90")}
        >
          90 dias
        </Button>

        {/* 🔹 Seletor de data específica */}
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setPeriod("custom");
          }}
          className="w-44"
        />
      </div>

      {/* 🔹 Relatório */}
      <SalesHistory
        type={type}
        groupBy="day"
        userId={userId}
      />
    </div>
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