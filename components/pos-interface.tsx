"use client";

import { useMemo, useCallback } from "react";
import EscPosEncoder from "esc-pos-encoder";
import { AnimatePresence } from "framer-motion"; // Certifique-se de importar
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
BOTÃO VOLTAR PWA (CORRIGIDO)
========================= */

function BackButtonApp() {
  // ✅ Removida a verificação isPWA para garantir visibilidade no tablet
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/dashboard")}
      // Mantendo o seu layout original exatamente como estava
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

  // --- ADICIONE ESTE BLOCO AQUI ---
  useEffect(() => {
    // Tenta recuperar/renovar a sessão ao carregar o PDV
    const setupSession = async () => {
      await supabase.auth.getSession();
    };
    setupSession();

    // Escuta mudanças (se o token expirar ou o usuário deslogar em outra aba)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);
  // --------------------------------

  // 1. Filtro de produtos
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(term));
  }, [products, searchTerm]);

  const productMap = useMemo(() => {
    return new Map(products.map((p) => [p.id, p]));
  }, [products]);
  
  const isWeightProduct = useCallback(
    (id: string) => {
      return !!productMap.get(id)?.is_weight;
    },
    [productMap]
  );

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const isWeight = !!productMap.get(product.id)?.is_weight;
      const existing = prev.find((i) => i.id === product.id);
  
      if (existing) {
        return prev.map((i) =>
          i.id === product.id
            ? {
                ...i,
                cartQuantity: i.cartQuantity + (isWeight ? 100 : 1),
              }
            : i
        );
      }
  
      return [
        ...prev,
        { ...product, cartQuantity: isWeight ? 100 : 1 },
      ];
    });
  }, [productMap]);

  const updateQuantity = useCallback((id: string, q: number) => {
    const isWeight = !!productMap.get(id)?.is_weight;
  
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id !== id) return item;
  
          // remove automaticamente se <= 0
          if (q <= 0) return null;
  
          let nextQty = q;
  
          // limitações aplicadas SEM bloquear UX
          if (isWeight) {
            const estoque = item.quantity * 1000;
            nextQty = Math.min(q, estoque);
          } else {
            nextQty = Math.min(q, item.quantity);
          }
  
          return {
            ...item,
            cartQuantity: nextQty,
          };
        })
        .filter(Boolean) as CartItem[];
    });
  }, [productMap]);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const total = useMemo(() => {
    return cart.reduce((sum, item) => {
      const isWeight = !!productMap.get(item.id)?.is_weight;
  
      const subtotal = isWeight
        ? (item.value / 100) * item.cartQuantity
        : item.value * item.cartQuantity;
  
      return sum + subtotal;
    }, 0);
  }, [cart, productMap]);

  // ✅ COLOQUE ESTA NOVA FUNÇÃO NO LUGAR DA "processSale"
  const finalizarVendaNoBanco = async (
    pagamentos: { metodo: string; valor: number }[]
  ) => {
    // 1. Tenta obter a sessão. O getSession() tenta renovar o token automaticamente se possível.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // 2. Se falhar, tentamos o getUser() que é uma chamada mais rigorosa ao servidor
    if (!session || sessionError) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert("Sua sessão expirou por segurança. O sistema irá recarregar.");
        window.location.href = "/login";
        return;
      }
    }

    // ... restante do seu código original (o try/catch da venda)
      // ... restante do seu código original

    try {
      const labelPagamento = 
      // ... restante do código permanece igual
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
  
      // ✅ NÃO limpa o carrinho aqui — será limpo no onClose
      return Promise.resolve();
    } catch (err) {
      console.error("Erro na venda:", err);
      throw err;
    }
  };
  

  const imprimirCupomSmart = async (pagamentos?: any[], itensRecentes?: CartItem[]) => {
    const itensParaImprimir = itensRecentes && itensRecentes.length > 0 ? itensRecentes : cart;
  
    // ===== CUPOM FORMATADO NO CONSOLE =====
    const L = '--------------------------------------------';
  
    const totalVenda = itensParaImprimir.reduce((sum, item) => {
      const isWeight = item.is_weight;
      return sum + (isWeight ? (item.value / 100) * item.cartQuantity : item.value * item.cartQuantity);
    }, 0);
  
    let c = '';
    c += 'Padaria Lanchonete Magnus Lobo\n';
    c += 'Rua Trese de Maio, 01 – Cantinho do Céu/SP\n';
    c += L + '\n';
    c += 'CUPOM NÃO FISCAL\n';
    c += L + '\n';
    // Cabeçalho colunas
    c += 'ITEM  DESCRIÇÃO           QTD   VL UNIT   VL TOTAL\n';
  
    itensParaImprimir.forEach((item, i) => {
      const isWeight = item.is_weight;
      const num = String(i + 1).padStart(3, '0');
      const nome = item.name.substring(0, 18).padEnd(20);
      const qtd = isWeight
        ? (item.cartQuantity / 1000).toFixed(3).padStart(4)
        : String(item.cartQuantity).padStart(4);
      const vlUnit = item.value.toFixed(2).replace('.', ',').padStart(7);
      const sub = (isWeight
        ? (item.value / 100) * item.cartQuantity
        : item.value * item.cartQuantity
      ).toFixed(2).replace('.', ',').padStart(9);
  
      c += `${num}   ${nome} ${qtd}  ${vlUnit}  ${sub}\n`;
    });
  
    c += L + '\n';
    c += '\n';
    c += `Subtotal:                          ${totalVenda.toFixed(2).replace('.', ',').padStart(9)}\n`;
    c += `Desconto:                          ${'0,00'.padStart(9)}\n`;
    c += `Total:                             ${totalVenda.toFixed(2).replace('.', ',').padStart(9)}\n`;
    c += L + '\n';
  
    if (pagamentos && pagamentos.length > 0) {
      c += '\n';
      pagamentos.forEach(p => {
        c += `Forma de Pagamento: ${p.metodo.charAt(0).toUpperCase() + p.metodo.slice(1)}\n`;
      });
      c += L + '\n';
    }
  
    const agora = new Date();
    const dataHora = agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    c += `Data/Hora: ${dataHora}\n`;
    c += L + '\n';
    c += '\n';
    c += '*** ESTE DOCUMENTO NÃO TEM VALOR FISCAL ***\n';
    c += 'Obrigado pela preferência!\n';
  
    console.log('\n' + c);
    // ===== FIM CUPOM CONSOLE =====
  
    // ===== IMPRESSÃO ESC/POS =====
    const encoder = new EscPosEncoder();
    let result = encoder.initialize().align('center')
      .line('Padaria Magnus Lobo')
      .line('Rua Treze de Maio, 01 - Cantinho do Céu/SP')
      .line(L)
      .line('CUPOM NAO FISCAL')
      .line(L)
      .align('left');
  
    itensParaImprimir.forEach((item, i) => {
      const isWeight = item.is_weight;
      const num = String(i + 1).padStart(3, '0');
      const nome = item.name.substring(0, 18).padEnd(20);
      const qtd = isWeight
        ? (item.cartQuantity / 1000).toFixed(3).padStart(4)
        : String(item.cartQuantity).padStart(4);
      const vlUnit = item.value.toFixed(2).padStart(7);
      const sub = (isWeight
        ? (item.value / 100) * item.cartQuantity
        : item.value * item.cartQuantity
      ).toFixed(2).padStart(9);
  
      result.text(`${num}   ${nome} ${qtd}  ${vlUnit}  ${sub}`).newline();
    });
  
    result.line(L);
    result.align('right')
      .line(`TOTAL: R$ ${totalVenda.toFixed(2)}`)
      .align('left');
  
    if (pagamentos && pagamentos.length > 0) {
      result.newline().line('PAGAMENTO:');
      pagamentos.forEach(p => {
        result.line(`${p.metodo.toUpperCase()}: R$ ${p.valor.toFixed(2)}`);
      });
    }
  
    result.newline()
      .align('center')
      .line('*** NAO TEM VALOR FISCAL ***')
      .line('Obrigado pela preferencia!')
      .newline().cut();
  
    const data = result.encode();
  
    try {
      const devices = await (navigator as any).bluetooth.getDevices();
      let targetDevice = devices[0] || await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['00001101-0000-1000-8000-00805f9b34fb']
      });
      const server = await targetDevice.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
      await characteristic.writeValue(data);
    } catch (e) {
      try {
        const ports = await (navigator as any).serial.getPorts();
        const port = ports[0] || await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 9600 });
        const writer = port.writable.getWriter();
        await writer.write(data);
        writer.releaseLock();
        await port.close();
      } catch (err) {
        console.warn("Impressora não encontrada. Cupom exibido apenas no console.");
      }
    }
  };
  

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden pt-[env(safe-area-inset-top)]">
      {/* COLUNA PRODUTOS */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Mantivemos o padding p-4 e o border-b original */}
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
                    onClick={addToCart.bind(null, p)}
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
            onClick={() => {
              console.log("Carrinho ao abrir o modal:", cart); // ✅ TESTE DE LOG
              setShowPayment(true);
            }}
            disabled={cart.length === 0}
          >
            <DollarSign className="mr-2 h-5 w-5" />
            Finalizar Venda
          </Button>
        </div>
      </aside>

      <AnimatePresence mode="wait">
        {showPayment && (
         <PaymentModal
         isOpen={showPayment}
         onClose={() => {
           // ✅ Agora apenas fecha o modal. 
           // Os itens continuam no 'cart' se o cliente quiser adicionar mais.
           setShowPayment(false); 
         }}
         total={total}
         onConfirm={async (pagamentos) => {
           try {
             await finalizarVendaNoBanco(pagamentos);
             // ✅ O carrinho só é limpo após o sucesso da gravação no banco
             setCart([]); 
             setShowPayment(false);
             router.refresh();
           } catch (err) {
             console.error("Erro ao finalizar:", err);
           }
         }}
         onPrint={(pagamentosDoModal, itensDoModal) => 
           imprimirCupomSmart(pagamentosDoModal, itensDoModal)
         }
         items={[...cart]}
         mesaInfo="Venda Balcão"
       />
       
        )}
      </AnimatePresence>
    </div>
  );
}
