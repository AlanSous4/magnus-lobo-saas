"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

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

      // marca como pago
      await supabase
        .from("clientes_pendentes")
        .update({ pago: true })
        .eq("id", p.id);

      // atualiza tela
      setPendentes((prev) =>
        prev.map((pend) => (pend.id === p.id ? { ...pend, pago: true } : pend))
      );
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

  return (
    <div className="max-w-5xl space-y-6 pb-20">
      <h1 className="text-3xl font-bold">Clientes Pendentes</h1>

      {/* FORMULÁRIO */}

      <div className="bg-white border rounded-xl shadow-sm">
        <div className="border-b px-6 py-4 font-semibold text-lg">
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

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
          />

          {filteredProducts.map((p) => (
            <div
              key={p.id}
              onClick={() => addProduct(p)}
              className="cursor-pointer p-2 hover:bg-gray-100"
            >
              {p.name} - R$ {p.value.toFixed(2)}
            </div>
          ))}

          {items.map((item) => (
            <div key={item.product_id} className="flex gap-3">
              <span className="w-40">{item.product_name}</span>

              <Input
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  updateQuantity(item.product_id, Number(e.target.value))
                }
              />

              <span>R$ {item.subtotal.toFixed(2)}</span>

              <Button
                className="cursor-pointer flex items-center gap-1 hover:bg-red-700"
                variant="destructive"
                onClick={() => removeItem(item.product_id)}
              >
                🗑
              </Button>
            </div>
          ))}

          <div className="flex justify-between">
            <b>Total: R$ {calcularTotalItens(items).toFixed(2)}</b>

            <Button
              className="cursor-pointer"
              onClick={editingId ? updatePendencia : savePendencia}
            >
              {editingId ? "Atualizar Pendência" : "Salvar Pendência"}
            </Button>
          </div>
        </div>
      </div>

      {/* LISTA */}

      <h2 className="text-lg font-semibold">Pendências</h2>

      {pendentes.map((p) => (
        <div key={p.id} className="border rounded-lg overflow-hidden">
          {/* LINHA PRINCIPAL */}
          <div
            className={`p-4 flex justify-between items-center cursor-pointer 
            ${p.pago ? "bg-green-100 hover:bg-green-200" : "hover:bg-gray-50"}`}
            onClick={() => togglePendencia(p.id)}
          >
            <div>
              <p className="font-semibold">{p.cliente_nome}</p>

              <p className="text-sm text-gray-500">
                {p.data_retirada.split("-").reverse().join("/")}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <b className="text-base">
                R${" "}
                {pendenteItens[p.id]
                  ? pendenteItens[p.id]
                      .reduce((acc, item) => acc + Number(item.subtotal), 0)
                      .toFixed(2)
                  : Number(p.total).toFixed(2)}
              </b>

              {/* BOTÕES */}
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
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
                  variant="destructive"
                  className="cursor-pointer flex items-center gap-1"
                  onClick={() => excluirPendencia(p.id)}
                >
                  <Trash2 size={16} />
                  Excluir
                </Button>
              </div>
            </div>
          </div>

          {/* LINHA EXPANSIVA */}
          {openPendencia === p.id && pendenteItens[p.id] && (
            <div className="border-t bg-gray-50">
              {/* CABEÇALHO */}
              <div className="grid grid-cols-3 text-sm font-semibold text-gray-600 px-4 py-2 border-b">
                <div>Produto</div>
                <div className="text-center">QTD</div>
                <div className="text-right">Total</div>
              </div>

              {/* ITENS */}
              <div className="divide-y">
                {pendenteItens[p.id].map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-3 px-4 py-2 text-sm"
                  >
                    <div>{item.product_name}</div>

                    <div className="text-center">{item.quantity} UN</div>

                    <div className="text-right">
                      R$ {Number(item.subtotal).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {showPaymentModal && pendenciaSelecionada && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 space-y-4 shadow-lg">
            <h2 className="text-xl font-bold">Receber pagamento</h2>

            <p>
              Cliente: <b>{pendenciaSelecionada.cliente_nome}</b>
            </p>

            <p>
              Valor: <b>R$ {Number(pendenciaSelecionada.total).toFixed(2)}</b>
            </p>

            <div className="space-y-2">
              <label className="flex gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="cash"
                  checked={selectedPayment === "cash"}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                />
                Dinheiro
              </label>

              <label className="flex gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="pix"
                  checked={selectedPayment === "pix"}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                />
                Pix
              </label>

              <label className="flex gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="credit"
                  checked={selectedPayment === "credit"}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                />
                Crédito
              </label>

              <label className="flex gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="debit"
                  checked={selectedPayment === "debit"}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                />
                Débito
              </label>

              <label className="flex gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="vr"
                  checked={selectedPayment === "vr"}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                />
                VR
              </label>

              <label className="flex gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="va"
                  checked={selectedPayment === "va"}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                />
                VA
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
              >
                Cancelar
              </Button>

              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  receberPendencia(pendenciaSelecionada, selectedPayment);
                  setShowPaymentModal(false);
                }}
              >
                Confirmar pagamento
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
