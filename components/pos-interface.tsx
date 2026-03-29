"use client";

import { useState, useEffect } from "react";
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
  ArrowLeft,
  QrCode,
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

type PaymentMethod = "credit" | "debit" | "vr" | "va" | "cash" | "pix";

/* =========================
PRODUTOS POR PESO
========================= */

const WEIGHT_PRODUCT_IDS = [
  "b8a6c2ca-623c-41a2-bfec-9fa27ce7c6cc",
  "193b8a3a-d2a7-485d-bb31-59157002eea6",
  "f27d497c-f0c7-4f3b-9a86-25130ec03dd4",
  "3dc7d0cc-eb8a-42e4-828d-b62727d96cf2",
];

const paymentMethods = [
  { id: "credit" as PaymentMethod, label: "Crédito", icon: CreditCard },
  { id: "debit" as PaymentMethod, label: "Débito", icon: CreditCard },
  { id: "vr" as PaymentMethod, label: "VR", icon: UtensilsCrossed },
  { id: "va" as PaymentMethod, label: "VA", icon: Coffee },
  { id: "cash" as PaymentMethod, label: "Dinheiro", icon: Wallet },
  { id: "pix" as PaymentMethod, label: "Pix", icon: QrCode },
];

/* =========================
DATA CORRETA BRASIL
========================= */

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
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [valoresPagamento, setValoresPagamento] = useState<{ [key in PaymentMethod]?: number }>({});

  const router = useRouter();

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isWeightProduct = (id: string) => WEIGHT_PRODUCT_IDS.includes(id);

  const addToCart = (product: Product) => {
    const existing = cart.find((i) => i.id === product.id);
    const isWeight = isWeightProduct(product.id);

    if (existing) {
      updateQuantity(product.id, existing.cartQuantity + (isWeight ? 100 : 1));
    } else {
      setCart([...cart, { ...product, cartQuantity: isWeight ? 100 : 1 }]);
    }
  };

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

  // CÁLCULOS DE PAGAMENTO (COLE ESTAS DUAS LINHAS AQUI)
  const totalPago = Object.values(valoresPagamento).reduce((acc, val) => acc + (val || 0), 0);
  const troco = totalPago > total ? totalPago - total : 0;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowPayment(true);
  };

  const processSale = async () => {
    if (totalPago < (total - 0.01) || isProcessing) return;
    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // GERA O TEXTO COMBINADO (Igual ao Clientes Pendentes)
      const entradas = Object.entries(valoresPagamento).filter(([_, v]) => (v || 0) > 0);
      
      let labelPagamento = "";
      if (entradas.length > 1) {
        // Se tiver mais de uma forma, cria o texto: "pix (R$ 10.00) + cash (R$ 5.00)"
        labelPagamento = entradas
          .map(([metodo, valor]) => `${metodo} (R$ ${valor?.toFixed(2)})`)
          .join(" + ");
      } else {
        // Se for só uma, salva o nome limpo
        labelPagamento = entradas[0][0];
      }

      const { data: sale, error } = await supabase
        .from("sales")
        .insert({
          user_id: user.id,
          total_amount: total,
          total_value: total, // Usando a coluna que existe no seu SQL
          payment_method: labelPagamento, // Aqui vai o texto combinado
          created_at: getBrazilISOString(),
        })
        .select()
        .single();

        if (error || !sale) {
          // O ?. garante que se o erro for null, ele não quebra o código
          console.error("Erro ao criar venda:", error?.message || "Erro desconhecido");
          return;
        }

      // ... (Restante do código de inserir itens e baixar estoque continua igual)
      for (const item of cart) {
        const isWeight = isWeightProduct(item.id);
        const quantityToSave = isWeight ? item.cartQuantity / 1000 : item.cartQuantity;
        const subtotal = isWeight ? (item.value / 100) * item.cartQuantity : item.value * item.cartQuantity;

        await supabase.from("sale_items").insert({
          sale_id: sale.id,
          product_id: item.id,
          quantity: quantityToSave,
          unit_price: item.value,
          subtotal,
          is_weight: isWeight,
        });

        await supabase.from("products").update({
          quantity: item.quantity - quantityToSave,
          exit_date: new Date().toISOString(),
        }).eq("id", item.id);
      }

      setCart([]);
      setValoresPagamento({});
      setShowPayment(false);
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        router.refresh();
      }, 2000);
    } catch (err) {
      console.error("Erro inesperado:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* COLUNA PRODUTOS */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b bg-background shrink-0 flex items-center justify-between">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-orange-600" /> PDV - Ponto de Venda
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-3 pb-100 lg:pb-8">
              {filteredProducts.map((p) => {
                const isWeight = isWeightProduct(p.id);
                return (
                  <Card
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="cursor-pointer"
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
      <aside className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t lg:static lg:w-96 lg:h-screen lg:border-l lg:border-t-0 flex flex-col shrink-0">
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
            onClick={handleCheckout}
            disabled={cart.length === 0}
          >
            <DollarSign className="mr-2 h-5 w-5" />
            Finalizar Venda
          </Button>
        </div>
      </aside>

      {/* DIALOGS */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
      <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Forma de Pagamento</DialogTitle>
            <DialogDescription className="font-bold text-base text-orange-600">
              Total a pagar: R$ {total.toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          {/* Grid de Botões (Seu estilo original) */}
          <div className="grid grid-cols-2 gap-3 py-4">
            {paymentMethods.map((m) => {
              const Icon = m.icon;
              const isAtivo = (valoresPagamento[m.id] || 0) > 0;
              return (
                <div key={m.id} className="flex flex-col gap-2">
                  <Button
                    variant={isAtivo ? "default" : "outline"}
                    className="h-20 flex flex-col gap-2 cursor-pointer transition-all"
                    onClick={() => {
                      if (!valoresPagamento[m.id]) {
                        const falta = total - totalPago;
                        setValoresPagamento({ ...valoresPagamento, [m.id]: falta > 0 ? falta : 0 });
                      } else {
                        const novos = { ...valoresPagamento };
                        delete novos[m.id];
                        setValoresPagamento(novos);
                      }
                    }}
                  >
                    <Icon className="h-6 w-6" />
                    {m.label}
                  </Button>
                  
                  {/* Input aparece só se o botão for ativado */}
                  {isAtivo && (
                    <Input
                      type="number"
                      placeholder="Valor"
                      className="h-8 text-center border-orange-400 font-bold focus:ring-orange-500"
                      value={valoresPagamento[m.id]}
                      onChange={(e) => setValoresPagamento({ 
                        ...valoresPagamento, 
                        [m.id]: parseFloat(e.target.value) || 0 
                      })}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Resumo Financeiro */}
          <div className="bg-muted p-3 rounded-lg space-y-1 border">
            <div className="flex justify-between text-sm">
              <span>Total Recebido:</span>
              <span className="font-bold">R$ {totalPago.toFixed(2)}</span>
            </div>
            {troco > 0 && (
              <div className="flex justify-between text-green-600 font-bold">
                <span>Troco:</span>
                <span>R$ {troco.toFixed(2)}</span>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button 
              variant="outline" 
              className="cursor-pointer" 
              onClick={() => { setShowPayment(false); setValoresPagamento({}); }}
            >
              Cancelar
            </Button>
            <Button
              className="cursor-pointer bg-orange-600 hover:bg-orange-700"
              onClick={processSale}
              disabled={totalPago < (total - 0.01) || isProcessing}
            >
              {isProcessing ? "Processando..." : "Confirmar Venda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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