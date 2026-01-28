"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingCart,
  CreditCard,
  Wallet,
  DollarSign,
  UtensilsCrossed,
  Coffee,
  Check,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

/* =========================
   TIPOS
========================= */

interface Product {
  id: string;
  name: string;
  value: number;
  quantity: number;
  image_url?: string | null;
}

interface CartItem extends Product {
  cartQuantity: number;
}

interface POSInterfaceProps {
  products: Product[];
  userId: string;
}

type PaymentMethod = "credit" | "debit" | "vr" | "va" | "cash";

const paymentMethods = [
  { id: "credit" as PaymentMethod, label: "Crédito", icon: CreditCard },
  { id: "debit" as PaymentMethod, label: "Débito", icon: CreditCard },
  { id: "vr" as PaymentMethod, label: "VR", icon: UtensilsCrossed },
  { id: "va" as PaymentMethod, label: "VA", icon: Coffee },
  { id: "cash" as PaymentMethod, label: "Dinheiro", icon: Wallet },
];

export function POSInterface({ products, userId }: POSInterfaceProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const router = useRouter();

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* =========================
     CARRINHO
  ========================= */

  const addToCart = (product: Product) => {
    const existing = cart.find((i) => i.id === product.id);

    if (existing) {
      if (existing.cartQuantity < existing.quantity) {
        setCart(
          cart.map((i) =>
            i.id === product.id ? { ...i, cartQuantity: i.cartQuantity + 1 } : i
          )
        );
      }
    } else {
      setCart([...cart, { ...product, cartQuantity: 1 }]);
    }
  };

  const updateQuantity = (id: string, q: number) => {
    const item = cart.find((i) => i.id === id);
    if (!item) return;

    if (q <= 0) {
      setCart(cart.filter((i) => i.id !== id));
    } else if (q <= item.quantity) {
      setCart(cart.map((i) => (i.id === id ? { ...i, cartQuantity: q } : i)));
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((i) => i.id !== id));
  };

  const total = cart.reduce(
    (sum, item) => sum + item.value * item.cartQuantity,
    0
  );

  /* =========================
     FINALIZAR VENDA
  ========================= */

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowPayment(true);
  };

  const processSale = async () => {
    if (!selectedPayment) return;
    setIsProcessing(true);

    try {
      const { data: sale } = await supabase
        .from("sales")
        .insert({
          user_id: userId,
          total_amount: total,
          payment_method: selectedPayment,
        })
        .select()
        .single();

      for (const item of cart) {
        await supabase.from("sale_items").insert({
          sale_id: sale!.id,
          product_id: item.id,
          quantity: item.cartQuantity,
          unit_price: item.value,
          subtotal: item.value * item.cartQuantity,
        });

        await supabase
          .from("products")
          .update({
            quantity: item.quantity - item.cartQuantity,
            exit_date: new Date().toISOString(),
          })
          .eq("id", item.id);
      }

      setCart([]);
      setShowPayment(false);
      setSelectedPayment(null);
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        router.refresh();
      }, 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  /* =========================
     LAYOUT
  ========================= */

  return (
    <div className="h-screen flex flex-col lg:flex-row">
      {/* PRODUTOS */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b bg-background">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-orange-600" />
            PDV - Ponto de Venda
          </h1>

          <Input
            className="mt-3"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <ScrollArea className="flex-1 p-3 pb-32 lg:pb-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((p) => (
              <Card
                key={p.id}
                onClick={() => addToCart(p)}
                className="cursor-pointer"
              >
                <div className="h-20 bg-muted flex items-center justify-center">
                  {p.image_url ? (
                    <img src={p.image_url} className="h-full object-contain" />
                  ) : (
                    <span className="text-xs">Sem imagem</span>
                  )}
                </div>
                <CardContent className="p-2">
                  <p className="text-sm line-clamp-2">{p.name}</p>
                  <div className="flex justify-between mt-1">
                    <span className="font-bold text-orange-600">
                      R$ {p.value.toFixed(2)}
                    </span>
                    <Badge>{p.quantity}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* CARRINHO */}
      {/* CARRINHO */}
      <aside className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t lg:static lg:w-96 lg:border-l lg:border-t-0 flex flex-col">
        {/* HEADER DO CARRINHO */}
        <div className="flex items-center gap-2 px-4 py-3 border-b font-semibold">
          <ShoppingCart className="h-5 w-5 text-orange-600" />
          Carrinho
        </div>

        {/* ITENS (SCROLL) */}
        <ScrollArea className="max-h-56 lg:flex-1 p-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">Carrinho vazio</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 mb-3"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    R$ {item.value.toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() =>
                      updateQuantity(item.id, item.cartQuantity - 1)
                    }
                  >
                    -
                  </Button>

                  <span className="w-6 text-center text-sm font-medium">
                    {item.cartQuantity}
                  </span>

                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() =>
                      updateQuantity(item.id, item.cartQuantity + 1)
                    }
                    disabled={item.cartQuantity >= item.quantity}
                  >
                    +
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </ScrollArea>

        {/* FOOTER FIXO */}
        <div className="p-4 border-t">
          <div className="flex justify-between font-bold mb-3">
            <span>Total</span>
            <span className="text-orange-600">R$ {total.toFixed(2)}</span>
          </div>

          <Button
            className="w-full h-12 text-lg"
            onClick={handleCheckout}
            disabled={cart.length === 0}
          >
            <DollarSign className="mr-2 h-5 w-5" />
            Finalizar Venda
          </Button>
        </div>
      </aside>

      {/* PAGAMENTO */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forma de Pagamento</DialogTitle>
            <DialogDescription>Total: R$ {total.toFixed(2)}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-4">
            {paymentMethods.map((m) => {
              const Icon = m.icon;
              return (
                <Button
                  key={m.id}
                  variant={selectedPayment === m.id ? "default" : "outline"}
                  className="h-20 flex flex-col gap-2"
                  onClick={() => setSelectedPayment(m.id)}
                >
                  <Icon className="h-6 w-6" />
                  {m.label}
                </Button>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>
              Cancelar
            </Button>
            <Button
              onClick={processSale}
              disabled={!selectedPayment || isProcessing}
            >
              {isProcessing ? "Processando..." : "Confirmar Venda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUCESSO */}
      <Dialog open={showSuccess}>
        <DialogContent>
          <VisuallyHidden>
            <DialogTitle>Venda concluída</DialogTitle>
          </VisuallyHidden>

          <div className="flex flex-col items-center p-6">
            <Check className="h-10 w-10 text-green-600 mb-3" />
            <p>Venda realizada com sucesso</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
