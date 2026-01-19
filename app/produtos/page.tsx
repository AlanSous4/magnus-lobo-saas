import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProductList } from "@/components/product-list";
import { AddProductDialog } from "@/components/add-product-dialog";
import { Package, AlertTriangle } from "lucide-react";
import TestUploadButton from "@/components/test-upload-button"; // 🔹 import do botão de teste

const ESTOQUE_CRITICO = 5;
const DIAS_PARA_VENCER = 7;

function isNearExpiration(expiresAt: string | null, days = 7) {
  if (!expiresAt) return false;

  const today = new Date();
  const expiration = new Date(expiresAt);

  const diffDays =
    (expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

  return diffDays <= days;
}

export default async function ProductsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 🔹 Buscar produtos do usuário
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const safeProducts = products || [];

  // 🔹 Contadores de alerta
  const nearExpirationCount = safeProducts.filter((p) =>
    isNearExpiration(p.expires_at, DIAS_PARA_VENCER)
  ).length;

  const lowStockCount = safeProducts.filter(
    (p) => p.stock <= ESTOQUE_CRITICO
  ).length;

  return (
    <div className="flex min-h-screen flex-col">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-orange-600" />
            <h1 className="text-xl font-semibold">Gestão de Produtos</h1>
          </div>
          <AddProductDialog userId={user.id} />
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main className="flex-1 container px-4 py-6 space-y-6">
        {/* 🔔 ALERTAS VISUAIS */}
        {(nearExpirationCount > 0 || lowStockCount > 0) && (
          <div className="flex flex-wrap gap-4">
            {nearExpirationCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500 bg-red-50 px-4 py-2 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4" />
                {nearExpirationCount} produto(s) perto do vencimento
              </div>
            )}

            {lowStockCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-orange-500 bg-orange-50 px-4 py-2 text-sm text-orange-700">
                <AlertTriangle className="h-4 w-4" />
                {lowStockCount} produto(s) com estoque baixo
              </div>
            )}
          </div>
        )}

        {/* 🔹 LISTA DE PRODUTOS */}
        <ProductList
          products={safeProducts}
          estoqueCritico={ESTOQUE_CRITICO}
          diasParaVencer={DIAS_PARA_VENCER}
        />

        {/* ================= TESTE DE UPLOAD ================= */}
      </main>
    </div>
  );
}
