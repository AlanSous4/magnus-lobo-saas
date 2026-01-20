"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  X,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client"; // ✅ instância única
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

/* =========================
   🔹 TIPOS
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

/* =========================
   🔹 COMPONENTE
   ========================= */

export function POSInterface({ products, userId }: POSInterfaceProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const router = useRouter();

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* =========================
     🛒 CARRINHO
     ========================= */

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      if (existingItem.cartQuantity < existingItem.quantity) {
        setCart(
          cart.map((item) =>
            item.id === product.id
              ? { ...item, cartQuantity: item.cartQuantity + 1 }
              : item
          )
        );
      }
    } else {
      setCart([...cart, { ...product, cartQuantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const item = cart.find((item) => item.id === productId);
    if (!item) return;

    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else if (newQuantity <= item.quantity) {
      setCart(
        cart.map((item) =>
          item.id === productId
            ? { ...item, cartQuantity: newQuantity }
            : item
        )
      );
    }
  };

  const getTotalAmount = () =>
    cart.reduce((total, item) => total + item.value * item.cartQuantity, 0);

  /* =========================
     💳 FINALIZAR VENDA
     ========================= */

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowPayment(true);
  };

  const processSale = async () => {
    if (!selectedPayment) return;

    setIsProcessing(true);

    try {
      // ✅ usa instância única supabase, não createClient()
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          user_id: userId,
          total_amount: getTotalAmount(),
          payment_method: selectedPayment,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      for (const item of cart) {
        await supabase.from("sale_items").insert({
          sale_id: sale.id,
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
    } catch (error) {
      console.error("Erro ao processar venda:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  /* =========================
     🧱 LAYOUT
     ========================= */

  return (
    <div className="flex h-screen bg-background">
      {/* PRODUTOS */}
      <div className="flex-1 flex flex-col border-r">
        <div className="border-b p-4">
          <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-orange-600" />
            PDV - Ponto de Venda
          </h1>

          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:bg-accent"
                onClick={() => addToCart(product)}
              >
                <div className="h-24 bg-muted flex items-center justify-center overflow-hidden rounded-t-md">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Sem imagem
                    </span>
                  )}
                </div>

                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-sm line-clamp-2">{product.name}</CardTitle>
                </CardHeader>

                <CardContent className="p-3 pt-0">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-orange-600">
                      R$ {product.value.toFixed(2)}
                    </span>
                    <Badge variant="secondary">{product.quantity}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* CARRINHO */}
      <div className="w-full sm:w-96 flex flex-col bg-muted/30">
        <div className="border-b p-4 bg-background">
          <h2 className="text-xl font-semibold">Carrinho</h2>
        </div>

        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-2 opacity-50" />
              <p>Carrinho vazio</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-3">
                    <div className="flex justify-between mb-2">
                      <h3 className="text-sm font-medium">{item.name}</h3>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.cartQuantity - 1)}
                        >
                          -
                        </Button>
                        <span>{item.cartQuantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.cartQuantity + 1)}
                          disabled={item.cartQuantity >= item.quantity}
                        >
                          +
                        </Button>
                      </div>

                      <span className="font-bold text-orange-600">
                        R$ {(item.value * item.cartQuantity).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-4 space-y-4 bg-background">
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-orange-600">R$ {getTotalAmount().toFixed(2)}</span>
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
      </div>

      {/* DIALOG PAGAMENTO */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forma de Pagamento</DialogTitle>
            <DialogDescription>Total: R$ {getTotalAmount().toFixed(2)}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-4">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <Button
                  key={method.id}
                  variant={selectedPayment === method.id ? "default" : "outline"}
                  className="h-20 flex flex-col gap-2"
                  onClick={() => setSelectedPayment(method.id)}
                >
                  <Icon className="h-6 w-6" />
                  {method.label}
                </Button>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>
              Cancelar
            </Button>
            <Button onClick={processSale} disabled={!selectedPayment || isProcessing}>
              {isProcessing ? "Processando..." : "Confirmar Venda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG SUCESSO */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="sr-only">Venda realizada com sucesso</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center p-6">
            <Check className="h-10 w-10 text-green-600 mb-3" />
            <p className="text-muted-foreground">Venda realizada com sucesso</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
