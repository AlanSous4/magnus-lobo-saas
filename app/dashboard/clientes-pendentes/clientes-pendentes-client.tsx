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
  is_weight?: boolean;
  active?: boolean; // Adicionado aqui
};

type Item = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_weight: boolean;
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
  is_weight: boolean; // ADICIONE ESTA LINHA
};

/* =========================
   FUNÇÃO DE MOEDA (R$)
========================= */
function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function ClientesPendentesClient() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSplit, setIsSplit] = useState(false);
  const [selectedPayment2, setSelectedPayment2] = useState("pix");
  const [valueForm1, setValueForm1] = useState(0);

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
  const [selectedPayment, setSelectedPayment] = useState("cash");
  const [pendenciaSelecionada, setPendenciaSelecionada] =
    useState<Pendente | null>(null);

  const calcularTotalItens = (lista: Item[]) => {
    return lista.reduce((acc, item) => acc + item.subtotal, 0);
  };

  useEffect(() => {
    const salvo = localStorage.getItem("pendencias_pagas_timer");
    if (salvo) {
      try {
        setPendenciasTemporarias(JSON.parse(salvo));
      } catch (e) {
        console.error("Erro ao carregar cache de pagamentos", e);
      }
    }

    // Inicia data de hoje
    setData(new Date().toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, value, is_weight, active") // Adicionado active
        .eq("active", true) // ✅ FILTRO: Apenas produtos ativos aparecem na busca
        .order("name");

      if (data) setProducts(data);
    };

    fetchProducts();
  }, []);

  const fetchPendencias = async () => {
    // Buscamos apenas o que não está pago OU o que foi pago recentemente
    const { data, error } = await supabase
      .from("clientes_pendentes")
      .select(`*, clientes_pendentes_itens (*)`)
      .or(`pago.eq.false, pago.eq.true`) // Buscamos ambos para o useMemo filtrar localmente
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    if (!data) return;
    setPendentes(data);

    const itensMap: Record<string, PendenteItem[]> = {};
    data.forEach((p: any) => {
      if (p.clientes_pendentes_itens) {
        itensMap[p.id] = p.clientes_pendentes_itens;
      }
    });
    setPendenteItens(itensMap);
  };

  useEffect(() => {
    const salvo = localStorage.getItem("pendencias_pagas_timer");
    if (salvo) {
      try {
        setPendenciasTemporarias(JSON.parse(salvo));
      } catch (e) {
        console.error("Erro ao carregar cache", e);
      }
    }
    fetchPendencias();
  }, []);

  /* AUTO REFRESH DAS PENDÊNCIAS PAGAS COM PERSISTÊNCIA */
  useEffect(() => {
    const interval = setInterval(() => {
      const agora = Date.now();
      setPendenciasTemporarias((prev) => {
        const novoStorage: Record<string, number> = {};
        let mudou = false;

        Object.entries(prev).forEach(([id, timestamp]) => {
          if (agora - timestamp < 60000) {
            novoStorage[id] = timestamp;
          } else {
            mudou = true; // Alguém expirou!
          }
        });

        if (mudou) {
          localStorage.setItem(
            "pendencias_pagas_timer",
            JSON.stringify(novoStorage)
          );
          return novoStorage;
        }
        return prev;
      });
    }, 1000); // Roda a cada 1 segundo

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const itens = pendenteItens[p.id];

      if (!user || !itens) {
        console.error("ERRO: Usuário ou itens não encontrados", {
          user,
          itens,
        });
        return;
      }

      // 🔹 Lógica do Label de Pagamento
      let labelPagamento = payment;
      if (isSplit) {
        const v1 = Number(valueForm1).toFixed(2);
        const v2 = (Number(p.total) - Number(valueForm1)).toFixed(2);
        labelPagamento = `${payment} (R$ ${v1}) + ${selectedPayment2} (R$ ${v2})`;
      }

      console.log("Tentando processar pagamento:", labelPagamento);

      // 1. MARCA COMO PAGO
      const { error: updateError } = await supabase
        .from("clientes_pendentes")
        .update({ pago: true })
        .eq("id", p.id);

      if (updateError) {
        console.error("Erro no passo 1 (Update Pago):", updateError);
        throw new Error(`Erro ao atualizar status: ${updateError.message}`);
      }

      // 2. CRIA A VENDA
      const { data: venda, error: vErr } = await supabase
        .from("sales")
        .insert({
          total_amount: p.total,
          total_value: p.total,
          payment_method: labelPagamento,
          user_id: user.id,
        })
        .select()
        .single();

      if (vErr) {
        console.error("Erro no passo 2 (Insert Sales):", vErr);
        throw new Error(`Erro ao criar venda: ${vErr.message}`);
      }

      // 3. CRIA ITENS DA VENDA
      // Ajuste aqui: verifique se os nomes das colunas batem com sua tabela 'sale_items'
      const saleItems = itens.map((i) => ({
        sale_id: venda.id,
        product_id: i.product_id || null, // Evita erro se o ID for undefined
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.subtotal,
      }));

      const { error: itemsErr } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsErr) {
        console.error("Erro no passo 3 (Insert Sale Items):", itemsErr);
        throw new Error(`Erro nos itens da venda: ${itemsErr.message}`);
      }

            // 4. BAIXA NO ESTOQUE
for (const item of itens) {
  if (!item.product_id) {
    console.log("Item sem product_id, pulando:", item.product_name);
    continue;
  }

  const { data: prod, error: fetchErr } = await supabase
    .from("products")
    .select("quantity")
    .eq("id", item.product_id)
    .maybeSingle();

  console.log("Produto encontrado:", item.product_name, prod, "Erro:", fetchErr);

  if (prod) {
    const novaQtd = Number(prod.quantity) - Number(item.quantity);
    console.log(`Estoque atual: ${prod.quantity}, Vendido: ${item.quantity}, Novo: ${novaQtd}`);
    
    const { error: updateErr } = await supabase
      .from("products")
      .update({ quantity: novaQtd })
      .eq("id", item.product_id);

    if (updateErr) {
      console.error("❌ ERRO ao dar baixa no estoque:", updateErr);
    } else {
      console.log("✅ Estoque atualizado:", item.product_name);
    }
  }
}

      

      // 4. PERSISTÊNCIA E FINALIZAÇÃO
      const agora = Date.now();
      setPendenciasTemporarias((prev) => {
        const novo = { ...prev, [p.id]: agora };
        localStorage.setItem("pendencias_pagas_timer", JSON.stringify(novo));
        return novo;
      });

      // Ativa a animação de sucesso
      setShowSuccess(true);

      // Limpa os estados e fecha os modais após 2 segundos
      setTimeout(() => {
        setShowSuccess(false);
        setIsSplit(false);
        setShowPaymentModal(false);
        setPendenciaSelecionada(null);
        fetchPendencias();
      }, 2000);
    } catch (error: any) {
      console.error("DETALHE DO ERRO:", error.message || error);
      alert(`Erro: ${error.message || "Erro desconhecido"}`); // Mantém alert só para erro crítico
    }
  };

  const addProduct = (product: Product) => {
    const exists = items.find((i) => i.product_id === product.id);

    if (exists) {
      // Aumenta 100g ou 1 unidade
      const increment = product.is_weight ? 100 : 1;
      updateQuantity(product.id, exists.quantity + increment);
      return;
    }

    // Lógica idêntica ao seu PDV: peso inicia com 100
    const initialQty = product.is_weight ? 100 : 1;

    // Cálculo do subtotal igual ao seu PDV: (valor / 100) * quantidade
    const initialSubtotal = product.is_weight
      ? (product.value / 100) * initialQty
      : product.value * initialQty;

    const newItem: Item = {
      product_id: product.id,
      product_name: product.name,
      quantity: initialQty,
      unit_price: product.value,
      subtotal: initialSubtotal,
      is_weight: !!product.is_weight, // Usa a informação TRUE que vem do seu banco
    };

    setItems((prev) => [...prev, newItem]);
    setSearch("");
    setFilteredProducts([]);
  };

  const updateQuantity = (productId: string, q: number) => {
    if (q <= 0) return;

    setItems((prev) =>
      prev.map((item) => {
        if (item.product_id !== productId) return item;

        // Lógica de cálculo do PDV
        const subtotal = item.is_weight
          ? (item.unit_price / 100) * q
          : item.unit_price * q;

        return { ...item, quantity: q, subtotal: Number(subtotal.toFixed(2)) };
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

    const { data: pendente, error: pErr } = await supabase
      .from("clientes_pendentes")
      .insert({
        cliente_nome: cliente,
        total,
        data_retirada: data,
        user_id: user?.id, // Garante que pegamos o ID do usuário logado
      })
      .select()
      .single();

    if (pErr) {
      alert("Erro ao criar pendência principal");
      return;
    }

    const itens = items.map((i) => ({
      pendente_id: pendente.id,
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.is_weight ? i.quantity / 1000 : i.quantity,
      unit_price: i.unit_price,
      subtotal: i.subtotal,
      is_weight: i.is_weight, // ADICIONE ESTA LINHA
    }));

    await supabase.from("clientes_pendentes_itens").insert(itens);

    // Reset completo dos estados de entrada
    setCliente("");
    setData(new Date().toISOString().split("T")[0]);
    setItems([]);
    setSearch("");
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
      quantity: i.is_weight ? i.quantity / 1000 : i.quantity,
      unit_price: i.unit_price,
      subtotal: i.subtotal,
      is_weight: i.is_weight, // ADICIONE ESTA LINHA
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
    // CORREÇÃO AQUI: Select simples, pois já estamos na tabela de itens
    const { data: itens, error } = await supabase
      .from("clientes_pendentes_itens")
      .select("*")
      .eq("pendente_id", p.id);

    if (error || !itens) {
      console.error("Erro ao buscar itens:", error);
      return;
    }

    setCliente(p.cliente_nome);

    // Remove timezone que causa -1 dia
    const dataFormatada = p.data_retirada.split("T")[0];
    setData(dataFormatada);

    setEditingId(p.id);

    const mapped: Item[] = itens.map((i) => {
      // Usamos a coluna is_weight que agora existe no banco
      const isWeight = !!i.is_weight;

      return {
        product_id: i.product_id || crypto.randomUUID(),
        product_name: i.product_name,
        // Se for peso no banco (0.500), volta para gramas (500) para o formulário
        quantity: isWeight ? i.quantity * 1000 : i.quantity,
        unit_price: i.unit_price,
        subtotal: i.subtotal,
        is_weight: isWeight,
      };
    });

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

  const pendentesVisiveis = useMemo(() => {
    const agora = Date.now();

    return pendentes
      .filter((p) => {
        // 1. Se NÃO está pago, mostra sempre
        if (!p.pago) return true;

        // 2. Se ESTÁ pago, mostra apenas se estiver no timer de 60s
        const tempoPagamento = pendenciasTemporarias[p.id];
        if (tempoPagamento) {
          return agora - tempoPagamento < 60000;
        }

        return false; // Se pago e sem timer, esconde
      })
      .sort((a, b) => {
        // Garante que pagos fiquem por último
        return Number(a.pago) - Number(b.pago);
      });
  }, [pendentes, pendenciasTemporarias]); // Re-calcula quando o timer ou a lista mudar

  return (
    <div className="max-w-5xl space-y-6 pb-20">
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
              className="w-1/2 cursor-pointer"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto para adicionar..."
              className="bg-gray-50 cursor-pointer"
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
                    <span className="text-blue-600 font-bold">
                      R$ {p.value.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Listagem de Itens no Formulário */}
          {items.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-xs font-bold text-gray-400 uppercase">
                Itens Selecionados
              </p>
              {items.map((item) => (
                <div
                  key={item.product_id}
                  className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border"
                >
                  <span className="flex-1 text-sm font-medium">
                    {item.product_name}
                  </span>

                  <div className="w-32 flex items-center gap-1">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        // Step 50 para subir de 50g em 50g como no PDV
                        step={item.is_weight ? 50 : 1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(
                            item.product_id,
                            Number(e.target.value)
                          )
                        }
                        className="h-9 text-center font-mono font-bold pr-6"
                        onFocus={(e) => e.target.select()}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">
                        {item.is_weight ? "g" : "un"}
                      </span>
                    </div>
                  </div>

                  <span className="w-24 text-right text-sm font-semibold">
                    {/* Removemos o R$ fixo daqui pois o formatCurrency já adiciona */}
                    {formatCurrency(item.subtotal)}
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
              Total:{" "}
              <span className="font-bold text-2xl text-blue-600">
                R$ {calcularTotalItens(items).toFixed(2)}
              </span>
            </div>

            <Button
              className="px-8 font-semibold shadow-md active:scale-95 transition-transform cursor-pointer"
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
          <span className="w-1.5 h-6 rounded-full" />
          Lista de Pendências
        </h2>

        <div className="grid gap-3">
          {pendentesVisiveis.map((p) => {
            const totalEfetivo = pendenteItens[p.id]
              ? pendenteItens[p.id].reduce(
                  (acc, item) => acc + Number(item.subtotal),
                  0
                )
              : Number(p.total);

            return (
              // Localize o mapeamento da lista: {pendentesVisiveis.map((p) => { ...
              <div
                key={p.id}
                className={`border rounded-xl transition-all overflow-hidden ${
                  p.pago
                    ? "bg-green-50 border-green-200 opacity-60 pointer-events-none" // pointer-events impede cliques acidentais no pago
                    : "bg-white hover:shadow-md"
                }`}
              >
                {/* LINHA PRINCIPAL */}
                <div
                  className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer"
                  onClick={() => togglePendencia(p.id)}
                >
                  <div className="flex gap-3">
                    <div
                      className={`mt-1.5 h-2.5 w-2.5 rounded-full${
                        p.pago ? "bg-green-500" : "bg-amber-500 animate-pulse"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800">
                          {p.cliente_nome}
                        </p>
                        {p.pago && (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase bg-green-600 text-white px-2 py-0.5 rounded-full">
                            <CheckCircle size={10} /> Pago
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-medium italic">
                        Retirada:{" "}
                        {p.data_retirada.split("-").reverse().join("/")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full md:w-auto gap-6">
                    <b className="text-lg font-bold text-gray-700">
                      R$ {totalEfetivo.toFixed(2)}
                    </b>

                    <div
                      className="flex gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!p.pago && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white cursor-pointer"
                            onClick={() => editarPendencia(p)}
                          >
                            Editar
                          </Button>

                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
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
                            className="text-gray-400 hover:text-red-600 cursor-pointer"
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
                        <div
                          key={item.id}
                          className="grid grid-cols-3 px-2 py-1.5 text-sm bg-white border rounded shadow-sm"
                        >
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-center text-gray-600 font-mono">
                            {item.is_weight === true
                              ? // Se for peso (is_weight explicitamente true no banco)
                                item.quantity < 1
                                ? `${(item.quantity * 1000).toFixed(0)}g`
                                : `${item.quantity
                                    .toFixed(3)
                                    .replace(".", ",")} Kg`
                              : // Se is_weight for false OU nulo (para itens antigos)
                                `${Math.floor(item.quantity)} un`}
                          </div>
                          <div className="text-right font-semibold">
                            R$ {Number(item.subtotal).toFixed(2)}
                          </div>
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
    <div className={`relative bg-white rounded-2xl p-6 w-full ${isSplit ? "max-w-md" : "max-w-sm"} space-y-6 shadow-2xl border transition-all max-h-[95vh] overflow-y-auto`}>
      
      {/* --- AQUI ENTRA A MELHORIA IGUAL AO PDV --- */}
      {showSuccess && (
        <div className="absolute inset-0 bg-green-600 flex flex-col items-center justify-center z-60 animate-in fade-in duration-300 rounded-2xl">
          <div className="bg-white/20 p-4 rounded-full mb-4 animate-bounce">
            <CheckCircle size={64} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-widest">
            Recebido!
          </h2>
          <p className="text-white/80 text-sm mt-2 font-medium italic">
            Venda registrada com sucesso
          </p>
        </div>
      )}
      {/* ------------------------------------------ */}

      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Receber Pagamento
        </h2>
              <p className="text-gray-500">Confirme os detalhes do cliente</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl space-y-2 border">
              <p className="flex justify-between">
                <span>Cliente:</span> <b>{pendenciaSelecionada.cliente_nome}</b>
              </p>
              <p className="flex justify-between text-lg text-blue-700 font-bold border-t pt-2 mt-2">
                <span>Total:</span>{" "}
                <span>R$ {Number(pendenciaSelecionada.total).toFixed(2)}</span>
              </p>
            </div>

            {/* BOTÃO PARA ATIVAR DIVISÃO - Estilo discreto */}
            <Button
              variant="ghost"
              size="sm"
              className={`w-full border border-dashed text-xs ${
                isSplit
                  ? "text-red-500 border-red-200"
                  : "text-blue-500 border-blue-200"
              }`}
              onClick={() => {
                setIsSplit(!isSplit);
                setValueForm1(Number(pendenciaSelecionada.total) / 2);
              }}
            >
              {isSplit
                ? "✕ Cancelar divisão de pagamento"
                : "➕ Receber em duas formas (Ex: Dinheiro + Pix)"}
            </Button>

            {/* ÁREA DE SELEÇÃO DE PAGAMENTO */}
            <div className="space-y-4">
              {/* FORMA 1 */}
              <div
                className={
                  isSplit
                    ? "space-y-2 p-3 border rounded-lg bg-gray-50/30"
                    : "space-y-4"
                }
              >
                {isSplit && (
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      Forma 1
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold">R$</span>
                      <Input
                        type="number"
                        className="h-7 w-24 text-right font-bold"
                        value={valueForm1}
                        onChange={(e) => setValueForm1(Number(e.target.value))}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {["cash", "pix", "credit", "debit", "vr", "va"].map(
                    (type) => (
                      <label
                        key={type}
                        className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedPayment === type
                            ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          className="hidden"
                          name="payment1"
                          value={type}
                          checked={selectedPayment === type}
                          onChange={(e) => setSelectedPayment(e.target.value)}
                        />
                        <span className="uppercase text-[10px] font-bold text-gray-700 w-full text-center">
                          {type === "cash"
                            ? "💵 Dinheiro"
                            : type === "pix"
                            ? "📱 Pix"
                            : type === "credit"
                            ? "💳 Crédito"
                            : type === "debit"
                            ? "💳 Débito"
                            : type.toUpperCase()}
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* FORMA 2 (SÓ APARECE SE DIVIDIDO) */}
              {isSplit && (
                <div className="space-y-2 p-3 border rounded-lg bg-blue-50/20 border-blue-100 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase text-blue-500">
                      Forma 2 (Restante)
                    </span>
                    <span className="text-sm font-bold text-blue-700">
                      R${" "}
                      {(
                        Number(pendenciaSelecionada.total) - valueForm1
                      ).toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {["cash", "pix", "credit", "debit", "vr", "va"].map(
                      (type) => (
                        <label
                          key={`split-${type}`}
                          className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedPayment2 === type
                              ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500"
                              : "bg-white hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            className="hidden"
                            name="payment2"
                            value={type}
                            checked={selectedPayment2 === type}
                            onChange={(e) =>
                              setSelectedPayment2(e.target.value)
                            }
                          />
                          <span className="uppercase text-[10px] font-bold text-gray-700 w-full text-center">
                            {type === "cash"
                              ? "💵 Dinheiro"
                              : type === "pix"
                              ? "📱 Pix"
                              : type === "credit"
                              ? "💳 Crédito"
                              : type === "debit"
                              ? "💳 Débito"
                              : type.toUpperCase()}
                          </span>
                        </label>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg font-bold cursor-pointer"
                onClick={() => {
                  receberPendencia(pendenciaSelecionada, selectedPayment);
                }}
              >
                Confirmar Recebimento
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-500 cursor-pointer"
                onClick={() => {
                  setShowPaymentModal(false);
                  setIsSplit(false);
                }}
              >
                Voltar
              </Button>
            </div>
          </div>

          {/* OVERLAY DE SUCESSO IGUAL AO PDV */}
          {showSuccess && (
            <div className="absolute inset-0 bg-green-600 flex flex-col items-center justify-center z-60 animate-in fade-in duration-300">
              <div className="bg-white/20 p-4 rounded-full mb-4 animate-bounce">
                <CheckCircle size={64} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white uppercase tracking-widest">
                Recebido!
              </h2>
              <p className="text-white/80 text-sm mt-2">
                Venda registrada com sucesso
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
