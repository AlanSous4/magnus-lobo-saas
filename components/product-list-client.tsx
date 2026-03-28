"use client";

import { useState, useEffect } from "react";
import { useProductsRealtime } from "@/hooks/use-products-realtime";
import { ProductList } from "@/components/product-list";
import { Product } from "@/types/product";

type Props = {
  initialProducts: Product[];
  userId: string;
  estoqueCritico: number;
  diasParaVencer: number;
};

export function ProductListClient({
  initialProducts,
  userId,
  estoqueCritico,
  diasParaVencer,
}: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);

  // Sincroniza o estado inicial caso venha do Server Component
  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useProductsRealtime({
    userId,

    onInsert: (product: Product) => {
      // Só adiciona se o novo produto estiver ativo
      if (product.active) {
        setProducts((prev) => [product, ...prev]);
      }
    },

    onUpdate: (updatedProduct: Product) => {
      setProducts((prev) => {
        // Se o produto foi desativado (Soft Delete), removemos da lista
        if (updatedProduct.active === false) {
          return prev.filter((p) => p.id !== updatedProduct.id);
        }

        // Se continua ativo, apenas atualizamos os dados na lista
        return prev.map((p) =>
          p.id === updatedProduct.id ? updatedProduct : p
        );
      });
    },

    onDelete: (id: string) => {
      // Mantemos para o caso de algum delete físico ocorrer
      setProducts((prev) => prev.filter((p) => p.id !== id));
    },
  });

  return (
    <ProductList
      products={products}
      estoqueCritico={estoqueCritico}
      diasParaVencer={diasParaVencer}
    />
  );
}