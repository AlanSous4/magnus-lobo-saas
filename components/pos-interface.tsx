"use client";

import { AnimatePresence } from "framer-motion" // Certifique-se de importar
import { PaymentModal } from "@/components/payment-modal";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, DollarSign, X, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/* =========================
TIPOS E CONFIGS
========================= */

interface Product {
  id: string;
  name: string;
  value: number;
  quantity: number;
  image_url?: string | null;
  is_weight: boolean;
}

interface CartItem extends Product {
  cartQuantity: number;
}

interface POSInterfaceProps {
  products: Product[];
  userId: string;
}


function getBrazilISOString() {
  const now = new Date();
  const brazil = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  return brazil.toISOString();
}

/* =========================
BOTÃO VOLTAR PWA
========================= */

function BackButtonApp() {
  const [isPWA, setIsPWA] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsPWA(standalone);
  }, []);

  if (!isPWA) return null;

  return (
    <button
      onClick={() => router.push("/dashboard")}
      className="flex items-center gap-2 bg-orange-600 text-white px-3 py-1 rounded-md hover:bg-orange-700 transition cursor-pointer"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </button>
  );
}

/* =========================
COMPONENTE PRINCIPAL
========================= */

export function POSInterface({ products, userId }: POSInterfaceProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPayment, setShowPayment] = useState(false);

  const router = useRouter();

  // 1. Filtro de produtos
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 2. Função isWeightProduct (MELHORADA)
  const isWeightProduct = (id: string) => {
    const foundProduct = products.find((p) => p.id === id);
    // Força a conversão para booleano caso o banco retorne null
    return !!foundProduct?.is_weight; 
  };

  // 3. Função addToCart
  const addToCart = (product: Product) => {
    const existing = cart.find((i) => i.id === product.id);
    const isWeight = isWeightProduct(product.id);

    if (existing) {
      updateQuantity(product.id, existing.cartQuantity + (isWeight ? 100 : 1));
    } else {
      setCart([...cart, { ...product, cartQuantity: isWeight ? 100 : 1 }]);
    }
  };

  // LOCAL: Função updateQuantity
  const updateQuantity = (id: string, q: number) => {
    const item = cart.find((i) => i.id === id);
    if (!item) return;

    const isWeight = isWeightProduct(id);

    if (q <= 0) {
      setCart(cart.filter((i) => i.id !== id));
      return;
    }

    if (isWeight) {
      const estoqueEmGramas = item.quantity * 1000;
      if (q > estoqueEmGramas) return;
    } else {
      if (q > item.quantity) return;
    }

    setCart(cart.map((i) => (i.id === id ? { ...i, cartQuantity: q } : i)));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((i) => i.id !== id));
  };

  const total = cart.reduce((sum, item) => {
    const isWeight = isWeightProduct(item.id);
    const subtotal = isWeight
      ? (item.value / 100) * item.cartQuantity
      : item.value * item.cartQuantity;
    return sum + subtotal;
  }, 0);

  // ✅ COLOQUE ESTA NOVA FUNÇÃO NO LUGAR DA "processSale"
  const finalizarVendaNoBanco = async (
    pagamentos: { metodo: string; valor: number }[]
  ) => {
    try {
      const labelPagamento =
        pagamentos.length > 1
          ? pagamentos
              .map((p) => `${p.metodo} (R$ ${p.valor.toFixed(2)})`)
              .join(" + ")
          : pagamentos[0].metodo;

          const { data: sale, error } = await supabase
          .from("sales")
          .insert({
            user_id: userId,
            total_amount: total,
            total_value: total,
            payment_method: labelPagamento,
            created_at: getBrazilISOString(),
          })
          .select()
          .single();

          if (error || !sale) throw new Error(error?.message);

          for (const item of cart) {
            const isWeight = isWeightProduct(item.id);
            const quantityToSave = isWeight
              ? item.cartQuantity / 1000 
              : item.cartQuantity;
            const subtotal = isWeight
              ? (item.value / 100) * item.cartQuantity
              : item.value * item.cartQuantity;

              await supabase.from("sale_items").insert({
                sale_id: sale.id,
                product_id: item.id,
                quantity: quantityToSave,
                unit_price: item.value,
                subtotal,
                is_weight: isWeight,
              });

              await supabase
              .from("products")
              .update({
                quantity: item.quantity - quantityToSave,
                exit_date: new Date().toISOString(),
              })
              .eq("id", item.id);
          }

      // 1. Aguarda 2 segundos com a venda já gravada no banco
      // Esse tempo é o que permite ao usuário ver a animação de "Sucesso" no modal
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 2. Agora sim, limpa o carrinho
      setCart([]);
      // 4. Atualiza os dados da página (estoque, etc) apenas uma vez
      router.refresh();
      // Retornamos uma Promise resolvida para o Modal saber que acabou
    return Promise.resolve();

    } catch (err) {
      console.error("Erro na venda:", err);
      throw err;
    }
  };
  

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* COLUNA PRODUTOS */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b bg-background shrink-0 flex items-center justify-between">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-orange-600" /> PDV - Ponto de
            Venda
          </h1>
          <BackButtonApp />
        </div>

        <Input
          className="mt-3 px-2 py-1 mx-4 shrink-0"
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full px-3">
            {/* Adicionado pb-[350px] no mobile para os produtos não ficarem embaixo do carrinho */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-3 pb-40 lg:pb-8">
              {filteredProducts.map((p) => {
                const isWeight = isWeightProduct(p.id);
                return (
                  <Card
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="cursor-pointer active:scale-95 transition-transform"
                  >
                    <div className="h-20 bg-muted flex items-center justify-center relative">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          className="h-full object-contain"
                          alt={p.name}
                        />
                      ) : (
                        <span className="text-xs">Sem imagem</span>
                      )}
                      {isWeight && (
                        <Badge className="absolute top-1 right-1 text-[10px]">
                          Venda por peso
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-2">
                      <p className="text-sm line-clamp-2">{p.name}</p>
                      <div className="flex justify-between mt-1 items-center">
                        <span className="font-bold text-orange-600">
                          R$ {p.value.toFixed(2)}
                        </span>
                        <Badge>{p.quantity}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* CARRINHO */}
      <aside className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t lg:static lg:w-96 lg:h-screen lg:border-l lg:border-t-0 flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b font-semibold bg-background">
          <ShoppingCart className="h-5 w-5 text-orange-600" />
          Carrinho
        </div>

        {/* Container da Lista com Scroll Limitado no Mobile */}
        <div className="flex-1 min-h-0 overflow-hidden bg-background">
          <ScrollArea className="h-53 lg:h-full p-3">
            {cart.map((item) => {
              const isWeight = isWeightProduct(item.id);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 mb-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        R$ {item.value.toFixed(2)}
                        {isWeight && " / 100g"}
                      </p>
                      {isWeight && (
                        <Badge variant="secondary" className="text-[10px]">
                          Venda por peso
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 md:h-14 md:w-14 lg:h-7 lg:w-7 cursor-pointer"
                      onClick={() =>
                        updateQuantity(
                          item.id,
                          item.cartQuantity - (isWeight ? 100 : 1)
                        )
                      }
                    >
                      -
                    </Button>

                    <Input
                      type="number"
                      min={isWeight ? 100 : 1}
                      step={isWeight ? 50 : 1}
                      value={item.cartQuantity}
                      onChange={(e) =>
                        updateQuantity(item.id, Number(e.target.value))
                      }
                      className="w-14 h-7 md:h-14 lg:h-7 text-center px-1"
                    />

                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 md:h-14 md:w-14 lg:h-7 lg:w-7 cursor-pointer"
                      onClick={() =>
                        updateQuantity(
                          item.id,
                          item.cartQuantity + (isWeight ? 100 : 1)
                        )
                      }
                    >
                      +
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 md:h-14 md:w-14 lg:h-7 lg:w-7 text-destructive cursor-pointer"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <X className="h-4 w-4 md:h-6 md:w-6 lg:h-4 lg:w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </ScrollArea>
        </div>

        <div className="p-4 border-t bg-background shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="flex justify-between font-bold mb-3">
            <span className="text-3xl">Total</span>
            <span className="text-3xl text-orange-600">
              R$ {total.toFixed(2)}
            </span>
          </div>

          <Button
            className="w-full h-12 text-lg cursor-pointer"
            onClick={() => setShowPayment(true)} // ✅ Deve estar apenas abrindo o modal
            disabled={cart.length === 0}
          >
            <DollarSign className="mr-2 h-5 w-5" />
            Finalizar Venda
          </Button>
        </div>
      </aside>


      {/* DIALOGS */}
      {/* ✅ COLOQUE APENAS ISSO NO LUGAR: */}
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        total={total}
        onConfirm={finalizarVendaNoBanco}
        mesaInfo="Venda Balcão"
      />
    </div>
  );
}
