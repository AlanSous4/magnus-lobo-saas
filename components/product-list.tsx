"use client";

import { Product } from "@/types/product";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Filter, Package, Search, X, WifiOff } from "lucide-react"; // Adicionei WifiOff
import TestUploadButton from "@/components/test-upload-button";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";

interface ProductListProps {
  products: Product[];
  estoqueCritico: number;
  diasParaVencer: number;
}

type ProductFilter = "all" | "low-stock" | "expiring-soon" | "expired";

function parseSafeDate(date: string | null) {
  if (!date) return null;
  return new Date(date + "T12:00:00");
}

export function ProductList({
  products,
  estoqueCritico,
  diasParaVencer,
}: ProductListProps) {
  const [filter, setFilter] = useState<ProductFilter>("all");
  const [search, setSearch] = useState("");
  const [localProducts, setLocalProducts] = useState<Product[]>(products);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  /* 🔄 Sincronização Inteligente + Cache Offline */
  useEffect(() => {
    const CACHE_KEY = "magnus_lobo_products_cache";

    if (products && products.length > 0) {
      // Se temos produtos vindo do servidor, atualiza o estado e o cache
      setLocalProducts(products);
      localStorage.setItem(CACHE_KEY, JSON.stringify(products));
      setIsOfflineMode(false);
    } else {
      // Se a lista veio vazia (erro de rede/timeout), tenta o LocalStorage
      const saved = localStorage.getItem(CACHE_KEY);
      if (saved) {
        setLocalProducts(JSON.parse(saved));
        setIsOfflineMode(true);
      }
    }
  }, [products]);

  /* Monitora status da rede em tempo real */
  useEffect(() => {
    const handleStatus = () => setIsOfflineMode(!navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  /* =========================
      🔹 Regras de Negócio
  ========================= */

  const isLowStock = (product: Product) => {
    if (product.is_weight) {
      return product.quantity <= 0.500;
    }
    return product.quantity <= estoqueCritico;
  };

  const isExpiringSoon = (date: string | null) => {
    const safeDate = parseSafeDate(date);
    if (!safeDate) return false;
    const diff = (safeDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= diasParaVencer;
  };

  const isExpired = (date: string | null) => {
    const safeDate = parseSafeDate(date);
    if (!safeDate) return false;
    return safeDate.getTime() < Date.now();
  };

  /* =========================
      🔹 Ações
  ========================= */

  const updateProductImage = (productId: string, url: string) => {
    setLocalProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, image_url: url } : p))
    );
  };

  /* =========================
      🔹 FILTRO + BUSCA (memo)
  ========================= */

  const filteredProducts = useMemo(() => {
    return localProducts.filter((product) => {
      if (search && !product.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (filter === "low-stock") return isLowStock(product);
      if (filter === "expiring-soon") return isExpiringSoon(product.expiration_date);
      if (filter === "expired") return isExpired(product.expiration_date);
      return true;
    });
  }, [filter, search, localProducts, estoqueCritico, diasParaVencer]);

  // Se realmente não houver nada nem no cache nem no servidor
  if (localProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhum produto disponível</h3>
        <p className="text-sm text-muted-foreground">Conecte-se à internet para sincronizar os dados.</p>
      </div>
    );
  }

  return (
    <>
      {/* Aviso de Modo Offline */}
      {isOfflineMode && (
        <div className="bg-amber-100 border-l-4 border-amber-500 p-4 mb-6 flex items-center">
          <WifiOff className="h-5 w-5 text-amber-600 mr-3" />
          <p className="text-sm text-amber-800">
            <strong>Modo Offline:</strong> Você está vendo dados salvos localmente. Vendas e alterações só serão sincronizadas quando a internet voltar.
          </p>
        </div>
      )}

      {/* =========================
          FILTROS + BUSCA
      ========================= */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            <Filter className="h-4 w-4 mr-2" />
            Todos
          </Button>

          <Button
            variant={filter === "low-stock" ? "default" : "outline"}
            onClick={() => setFilter("low-stock")}
          >
            ⚠️ Estoque baixo
          </Button>

          <Button
            variant={filter === "expiring-soon" ? "default" : "outline"}
            onClick={() => setFilter("expiring-soon")}
          >
            ⏳ Próx. vencimento
          </Button>

          <Button
            variant={filter === "expired" ? "destructive" : "outline"}
            onClick={() => setFilter("expired")}
          >
            ❌ Vencidos
          </Button>
        </div>

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
      </div>

      {/* =========================
          LISTA DE PRODUTOS
      ========================= */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isLowStock={isLowStock(product)}
            estoqueCritico={estoqueCritico}
            diasParaVencer={diasParaVencer}
            onImageUpdate={updateProductImage}
          />
        ))}
      </div>
    </>
  );
}