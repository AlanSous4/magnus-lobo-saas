"use client";

import { useState } from "react";
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

  // realtime do supabase
  useProductsRealtime({
    userId,

    onInsert: (product: Product) => {
      setProducts((prev) => [product, ...prev]);
    },

    onUpdate: (updatedProduct: Product) => {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === updatedProduct.id ? updatedProduct : p
        )
      );
    },

    onDelete: (id: string) => {
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