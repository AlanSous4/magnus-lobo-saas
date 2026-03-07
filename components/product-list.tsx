"use client";

import { Product } from "@/types/product";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Filter, Package, Search, X } from "lucide-react";
import TestUploadButton from "@/components/test-upload-button";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";

interface ProductListProps {
  products: Product[];
  estoqueCritico: number;
  diasParaVencer: number;
}

type ProductFilter =
  | "all"
  | "low-stock"
  | "expiring-soon"
  | "expired";

export function ProductList({
  products,
  estoqueCritico,
  diasParaVencer,
}: ProductListProps) {
  const [filter, setFilter] = useState<ProductFilter>("all");
  const [search, setSearch] = useState("");

  const [localProducts, setLocalProducts] =
    useState<Product[]>(products);

  /* 🔄 sincroniza realtime */
  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  /* =========================
     🔹 Regras
  ========================= */

  const isLowStock = (qtd: number) =>
    qtd <= estoqueCritico;

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;

    const diff =
      (new Date(date).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24);

    return diff > 0 && diff <= diasParaVencer;
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;

    return new Date(date) < new Date();
  };

  /* =========================
     🔹 Atualizar imagem
  ========================= */

  const updateProductImage = (
    productId: string,
    url: string
  ) => {
    setLocalProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, image_url: url }
          : p
      )
    );
  };

  /* =========================
     🔹 FILTRO + BUSCA (memo)
  ========================= */

  const filteredProducts = useMemo(() => {
    return localProducts.filter((product) => {
      /* busca por nome */
      if (
        search &&
        !product.name
          .toLowerCase()
          .includes(search.toLowerCase())
      ) {
        return false;
      }

      if (filter === "low-stock")
        return isLowStock(product.quantity);

      if (filter === "expiring-soon")
        return isExpiringSoon(
          product.expiration_date
        );

      if (filter === "expired")
        return isExpired(
          product.expiration_date
        );

      return true;
    });
  }, [filter, search, localProducts]);

  if (localProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          Nenhum produto cadastrado
        </h3>
      </div>
    );
  }

  return (
    <>
      {/* =========================
          FILTROS + BUSCA
      ========================= */}

      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">

        {/* BOTÕES */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">

          <Button
            className="cursor-pointer w-full sm:w-auto"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            <Filter className="h-4 w-4 mr-2" />
            Todos
          </Button>

          <Button
            className="cursor-pointer w-full sm:w-auto"
            variant={filter === "low-stock" ? "default" : "outline"}
            onClick={() => setFilter("low-stock")}
          >
            ⚠️ Estoque baixo
          </Button>

          <Button
            className="cursor-pointer w-full sm:w-auto"
            variant={filter === "expiring-soon" ? "default" : "outline"}
            onClick={() => setFilter("expiring-soon")}
          >
            ⏳ Próx. vencimento
          </Button>

          <Button
            className="cursor-pointer w-full sm:w-auto"
            variant={filter === "expired" ? "destructive" : "outline"}
            onClick={() => setFilter("expired")}
          >
            ❌ Vencidos
          </Button>
        </div>

        {/* BUSCA */}
        <div className="relative w-full sm:w-60">

          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />

          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8"
          />

          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Upload global */}
        {localProducts[0] && (
          <TestUploadButton
            productId={localProducts[0].id}
            onUploadSuccess={(url) =>
              updateProductImage(
                localProducts[0].id,
                url
              )
            }
          />
        )}
      </div>

      {/* =========================
          LISTA DE PRODUTOS
      ========================= */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            estoqueCritico={estoqueCritico}
            diasParaVencer={diasParaVencer}
            onImageUpdate={updateProductImage}
          />
        ))}
      </div>
    </>
  );
}