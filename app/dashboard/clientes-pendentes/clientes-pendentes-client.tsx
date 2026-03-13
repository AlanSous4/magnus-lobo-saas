"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle } from "lucide-react";

type Product = {
  id: string;
  name: string;
  value: number;
};

type Item = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type Pendente = {
  id: string;
  cliente_nome: string;
  total: number;
  data_retirada: string;
  pago?: boolean;
  created_at?: string; // Certifique-se de que este campo venha do Supabase
};

type PendenteItem = {
  id: string;
  pendente_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

export default function ClientesPendentesClient() {
  const [cliente, setCliente] = useState("");
  const [data, setData] = useState("");

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  const [items, setItems] = useState<Item[]>([]);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [pendenciasTemporarias, setPendenciasTemporarias] = useState<
    Record<string, number>
  >({});
  const [pendenteItens, setPendenteItens] = useState<
    Record<string, PendenteItem[]>
  >({});

  const [openPendencia, setOpenPendencia] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState("dinheiro");
  const [pendenciaSelecionada, setPendenciaSelecionada] =
    useState<Pendente | null>(null);

  const calcularTotalItens = (lista: Item[]) => {
    return lista.reduce((acc, item) => acc + item.subtotal, 0);
  };

  useEffect(() => {
    const hoje = new Date().toISOString().split("T")[0];
    setData(hoje);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,value")
        .order("name");

      if (data) setProducts(data);
    };

    fetchProducts();
  }, []);

  const fetchPendencias = async () => {
    const { data, error } = await supabase
      .from("clientes_pendentes")
      .select(
        `
        *,
        clientes_pendentes_itens (*)
      `
      )
      .order("pago", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    if (!data) return;

    setPendentes(data);

    const itensMap: Record<string, PendenteItem[]> = {};

    data.forEach((p) => {
      if (p.clientes_pendentes_itens) {
        itensMap[p.id] = p.clientes_pendentes_itens;
      }
    });

    setPendenteItens(itensMap);
  };

  useEffect(() => {
    fetchPendencias();    
  }, []);

  /* AUTO REFRESH DAS PENDÊNCIAS PAGAS - APENAS LIMPEZA DE ESTADO */
  useEffect(() => {
    const interval = setInterval(() => {
      setPendenciasTemporarias((prev) => {
        const now = Date.now();
        const atualizado: Record<string, number> = {};
        let houveMudanca = false;

        Object.entries(prev).forEach(([id, time]) => {
          if (now - time < 60000) {
            atualizado[id] = time;
          } else {
            houveMudanca = true; // Alguém expirou
          }
        });

        // Só atualiza o estado se algo realmente mudou para evitar re-renders infinitos
        return houveMudanca ? atualizado : prev;
      });
      
      // IMPORTANTE: Removi o fetchPendencias() daqui. 
      // Buscar no banco a cada 1 segundo quebra a lógica visual.
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!search) {
      setFilteredProducts([]);
      return;
    }

    const result = products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );

    setFilteredProducts(result);
  }, [search, products]);

  const excluirPendencia = async (id: string) => {
    const confirmar = confirm("Deseja excluir esta pendência?");

    if (!confirmar) return;

    try {
      // remove itens primeiro
      await supabase
        .from("clientes_pendentes_itens")
        .delete()
        .eq("pendente_id", id);

      // remove pendência
      await supabase.from("clientes_pendentes").delete().eq("id", id);

      // atualiza tela
      setPendentes((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir pendência");
    }
  };

  const receberPendencia = async (p: Pendente, payment: string) => {
    try {
      const itens = pendenteItens[p.id];

      if (!itens || itens.length === 0) {
        alert("Pendência sem itens");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Usuário não autenticado");
        return;
      }

      // cria venda
      const { data: venda, error: vendaError } = await supabase
        .from("sales")
        .insert({
          total_amount: p.total,
          total_value: p.total,
          payment_method: payment,
          user_id: user.id,
        })
        .select()
        .single();

      if (vendaError) {
        console.error("ERRO VENDA:", JSON.stringify(vendaError, null, 2));
        alert("Erro ao criar venda");
        return;
      }

      // cria itens da venda
      const saleItems = itens.map((item) => ({
        sale_id: venda.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }));

      await supabase.from("sale_items").insert(saleItems);

      // marca como pago no banco
      await supabase
        .from("clientes_pendentes")
        .update({ pago: true })
        .eq("id", p.id)

        // 1. Registra o tempo EXATO do pagamento para o contador de 60s
      setPendenciasTemporarias((prev) => ({
        ...prev,
        [p.id]: Date.now(),
      }));

      // ATUALIZA NA TELA IMEDIATAMENTE
      setPendentes((prev) => {
        const updated = prev.map((pend) =>
          pend.id === p.id ? { ...pend, pago: true } : pend
        );
      
        // mantém pendentes no topo e pagos no final
        return updated.sort((a, b) => {
          if (a.pago === b.pago) return 0;
          return a.pago ? 1 : -1;
        });
      });

      // registra momento do pagamento
      setPendenciasTemporarias((prev) => ({
        ...prev,
        [p.id]: Date.now(),
      }));

      
    } catch (error) {
      console.error(error);
      alert("Erro ao receber pagamento");
    }
  };

  const addProduct = (product: Product) => {
    const exists = items.find((i) => i.product_id === product.id);

    if (exists) {
      updateQuantity(product.id, exists.quantity + 1);
      return;
    }

    const newItem: Item = {
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: product.value,
      subtotal: product.value,
    };

    setItems((prev) => [...prev, newItem]);
    setSearch("");
    setFilteredProducts([]);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) quantity = 1;

    setItems((prev) =>
      prev.map((item) => {
        if (item.product_id !== productId) return item;

        const subtotal = quantity * item.unit_price;

        return { ...item, quantity, subtotal };
      })
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const savePendencia = async () => {
    if (!cliente || !data || items.length === 0) {
      alert("Preencha os campos.");
      return;
    }

    const total = calcularTotalItens(items);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: pendente } = await supabase
      .from("clientes_pendentes")
      .insert({
        cliente_nome: cliente,
        total,
        data_retirada: data,
        user_id: user?.id,
      })
      .select()
      .single();

    const itens = items.map((i) => ({
      pendente_id: pendente.id,
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      subtotal: i.subtotal,
    }));

    await supabase.from("clientes_pendentes_itens").insert(itens);

    setCliente("");
    setData("");
    setItems([]);
    setPendenteItens({});
    setOpenPendencia(null);

    fetchPendencias();
  };

  const updatePendencia = async () => {
    if (!editingId) return;

    const total = calcularTotalItens(items);

    await supabase
      .from("clientes_pendentes")
      .update({
        cliente_nome: cliente,
        total,
        data_retirada: data,
      })
      .eq("id", editingId);

    await supabase
      .from("clientes_pendentes_itens")
      .delete()
      .eq("pendente_id", editingId);

    const novosItens = items.map((i) => ({
      pendente_id: editingId,
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      subtotal: i.subtotal,
    }));

    await supabase.from("clientes_pendentes_itens").insert(novosItens);

    setPendentes((prev) =>
      prev.map((p) => (p.id === editingId ? { ...p, total } : p))
    );

    setEditingId(null);
    setCliente("");
    setData("");
    setItems([]);
    setPendenteItens({});
    setOpenPendencia(null);

    fetchPendencias();
  };

  const editarPendencia = async (p: Pendente) => {
    const { data: itens } = await supabase
      .from("clientes_pendentes_itens")
      .select("*")
      .eq("pendente_id", p.id);

    if (!itens) return;

    setCliente(p.cliente_nome);

    // remove timezone que causa -1 dia
    const dataFormatada = p.data_retirada.split("T")[0];
    setData(dataFormatada);

    setEditingId(p.id);

    const mapped = itens.map((i) => ({
      product_id: i.product_id || crypto.randomUUID(),
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      subtotal: i.subtotal,
    }));

    setItems(mapped);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const togglePendencia = (id: string) => {
    if (openPendencia === id) {
      setOpenPendencia(null);
    } else {
      setOpenPendencia(id);
    }
  };

  // Melhora na performance: Filtro e Ordenação memorizados
  const pendentesVisiveis = useMemo(() => {
    const agora = Date.now();
    return pendentes
      .filter((p) => {
        if (!p.pago) return true; // Se não está pago, mostra sempre
        const pagoTime = pendenciasTemporarias[p.id];

        // Se está pago mas NÃO tem tempo registrado ou o tempo acabou, esconde.
        if (!pagoTime) return false;

        const tempoDecorrido = agora - pagoTime;
        return tempoDecorrido < 60000;
      })
      .sort((a, b) => Number(a.pago) - Number(b.pago)); // Pagos vão para o fim da lista
  }, [pendentes, pendenciasTemporarias]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 p-4">
      <h1 className="text-3xl font-bold tracking-tight">Clientes Pendentes</h1>

      {/* FORMULÁRIO */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="border-b bg-gray-50/50 px-6 py-4 font-semibold text-lg text-gray-700">
          {editingId ? "Editar Pendência" : "Novo Cliente Pendente"}
        </div>

        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-3 gap-4 items-center">
            <label className="text-sm font-medium">Nome do Cliente:</label>
            <Input
              className="md:col-span-2"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Ex: João Silva"
            />

            <label className="text-sm font-medium">Data de Retirada:</label>
            <Input
              type="date"
              className="md:col-span-2"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto para adicionar..."
              className="bg-gray-50"
            />

            {/* Resultados da Busca */}
            {search && filteredProducts.length > 0 && (
              <div className="border rounded-md max-h-48 overflow-y-auto divide-y bg-white shadow-lg">
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      addProduct(p);
                      setSearch(""); // Limpa busca ao adicionar
                    }}
                    className="cursor-pointer p-3 hover:bg-blue-50 flex justify-between text-sm transition-colors"
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-blue-600 font-bold">R$ {p.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Listagem de Itens no Formulário */}
          {items.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-xs font-bold text-gray-400 uppercase">Itens Selecionados</p>
              {items.map((item) => (
                <div key={item.product_id} className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border">
                  <span className="flex-1 text-sm font-medium">{item.product_name}</span>

                  <div className="w-20">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product_id, Number(e.target.value))}
                      className="h-8 text-center"
                    />
                  </div>

                  <span className="w-24 text-right text-sm font-semibold">
                    R$ {item.subtotal.toFixed(2)}
                  </span>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-500 hover:bg-red-50"
                    onClick={() => removeItem(item.product_id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-lg">
              Total: <span className="font-bold text-2xl text-blue-600">R$ {calcularTotalItens(items).toFixed(2)}</span>
            </div>

            <Button
              className="px-8 font-semibold shadow-md active:scale-95 transition-transform"
              onClick={editingId ? updatePendencia : savePendencia}
            >
              {editingId ? "Atualizar Pendência" : "Salvar Pendência"}
            </Button>
          </div>
        </div>
      </div>

      {/* LISTA DE PENDÊNCIAS */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
          Lista de Pendências
        </h2>

        <div className="grid gap-3">
          {pendentesVisiveis.map((p) => {
            const totalEfetivo = pendenteItens[p.id]
              ? pendenteItens[p.id].reduce((acc, item) => acc + Number(item.subtotal), 0)
              : Number(p.total);

            return (
              <div
                key={p.id}
                className={`border rounded-xl transition-all overflow-hidden ${
                  p.pago ? "bg-green-50 border-green-200 opacity-80" : "bg-white hover:shadow-md"
                }`}
              >
                {/* LINHA PRINCIPAL */}
                <div
                  className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer"
                  onClick={() => togglePendencia(p.id)}
                >
                  <div className="flex gap-3">
                    <div className={`mt-1.5 h-2.5 w-2.5 rounded-full ${p.pago ? "bg-green-500" : "bg-amber-500 animate-pulse"}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800">{p.cliente_nome}</p>
                        {p.pago && (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase bg-green-600 text-white px-2 py-0.5 rounded-full">
                            <CheckCircle size={10} /> Pago
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-medium italic">
                        Retirada: {p.data_retirada.split("-").reverse().join("/")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full md:w-auto gap-6">
                    <b className="text-lg font-bold text-gray-700">R$ {totalEfetivo.toFixed(2)}</b>

                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {!p.pago && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white"
                            onClick={() => editarPendencia(p)}
                          >
                            Editar
                          </Button>

                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                              setPendenciaSelecionada(p);
                              setShowPaymentModal(true);
                            }}
                          >
                            Receber
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-red-600"
                            onClick={() => excluirPendencia(p.id)}
                          >
                            <Trash2 size={18} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* LINHA EXPANSIVA DE ITENS */}
                {openPendencia === p.id && pendenteItens[p.id] && (
                  <div className="border-t bg-gray-50/50 px-4 py-3">
                    <div className="grid grid-cols-3 text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest px-2">
                      <div>Produto</div>
                      <div className="text-center">Quantidade</div>
                      <div className="text-right">Subtotal</div>
                    </div>
                    <div className="space-y-1">
                      {pendenteItens[p.id].map((item) => (
                        <div key={item.id} className="grid grid-cols-3 px-2 py-1.5 text-sm bg-white border rounded shadow-sm">
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-center text-gray-600">{item.quantity} UN</div>
                          <div className="text-right font-semibold">R$ {Number(item.subtotal).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE PAGAMENTO */}
      {showPaymentModal && pendenciaSelecionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-6 shadow-2xl border">
            <div className="space-y-1 text-center">
              <h2 className="text-2xl font-bold text-gray-800">Receber Pagamento</h2>
              <p className="text-gray-500">Confirme os detalhes do cliente</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl space-y-2 border">
              <p className="flex justify-between"><span>Cliente:</span> <b>{pendenciaSelecionada.cliente_nome}</b></p>
              <p className="flex justify-between text-lg text-blue-700 font-bold border-t pt-2 mt-2">
                <span>Total:</span> <span>R$ {Number(pendenciaSelecionada.total).toFixed(2)}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {['cash', 'pix', 'credit', 'debit', 'vr', 'va'].map((type) => (
                <label key={type} className={`
                  flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all
                  ${selectedPayment === type ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'hover:bg-gray-50'}
                `}>
                  <input
                    type="radio"
                    className="hidden"
                    value={type}
                    checked={selectedPayment === type}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                  />
                  <span className="uppercase text-xs font-bold text-gray-700 w-full text-center">
                    {type === 'cash' ? '💵 Dinheiro' : 
                     type === 'pix' ? '📱 Pix' : 
                     type === 'credit' ? '💳 Crédito' : 
                     type === 'debit' ? '💳 Débito' : type.toUpperCase()}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg font-bold"
                onClick={() => {
                  receberPendencia(pendenciaSelecionada, selectedPayment);
                  setShowPaymentModal(false);
                }}
              >
                Confirmar Recebimento
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-500"
                onClick={() => setShowPaymentModal(false)}
              >
                Voltar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}