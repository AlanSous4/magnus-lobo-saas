"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const [pendenteItens, setPendenteItens] = useState<Record<string, PendenteItem[]>>({});

  const [openPendencia, setOpenPendencia] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  /* Buscar produtos */

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

  /* Buscar pendências */

  const fetchPendencias = async () => {

    const { data } = await supabase
      .from("clientes_pendentes")
      .select("*")
      .order("pago", { ascending: true })
      .order("created_at", { ascending: false });

    if (data) setPendentes(data);

  };

  useEffect(() => {
    fetchPendencias();
  }, []);

  /* Filtrar produtos */

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

  /* Adicionar produto */

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

    setItems((prev) =>
      prev.map((item) => {

        if (item.product_id !== productId) return item;

        const subtotal = quantity * item.unit_price;

        return { ...item, quantity, subtotal };

      })
    );

  };

  const removeItem = (productId: string) => {

    setItems((prev) =>
      prev.filter((item) => item.product_id !== productId)
    );

  };

  /* Calcular total */

  useEffect(() => {

    const t = items.reduce((acc, item) => acc + item.subtotal, 0);

    setTotal(t);

  }, [items]);

  /* Salvar pendência */

  const savePendencia = async () => {

    if (!cliente || !data || items.length === 0) {
      alert("Preencha os campos.");
      return;
    }

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

    await supabase
      .from("clientes_pendentes_itens")
      .insert(itens);

    setCliente("");
    setData("");
    setItems([]);
    setTotal(0);

    fetchPendencias();

  };

  /* Atualizar pendência */

  const updatePendencia = async () => {

    if (!editingId) return;

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

    await supabase
      .from("clientes_pendentes_itens")
      .insert(novosItens);

    setEditingId(null);
    setCliente("");
    setData("");
    setItems([]);
    setTotal(0);

    fetchPendencias();

  };

  /* Editar pendência */

  const editarPendencia = async (p: Pendente) => {

    const { data: itens } = await supabase
      .from("clientes_pendentes_itens")
      .select("*")
      .eq("pendente_id", p.id);

    if (!itens) return;

    setCliente(p.cliente_nome);
    setData(p.data_retirada);
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

  /* Abrir itens */

  const togglePendencia = async (id: string) => {

    if (openPendencia === id) {
      setOpenPendencia(null);
      return;
    }

    const { data } = await supabase
      .from("clientes_pendentes_itens")
      .select("*")
      .eq("pendente_id", id);

    if (data) {

      setPendenteItens((prev) => ({
        ...prev,
        [id]: data,
      }));

    }

    setOpenPendencia(id);

  };

  /* Converter venda */

  const converterVenda = async (p: Pendente) => {

    let itens = pendenteItens[p.id];

    if (!itens) {

      const { data } = await supabase
        .from("clientes_pendentes_itens")
        .select("*")
        .eq("pendente_id", p.id);

      itens = data || [];

    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: sale } = await supabase
      .from("sales")
      .insert({
        user_id: user?.id,
        total_value: p.total,
        payment_method: "fiado",
      })
      .select()
      .single();

    if (itens.length > 0) {

      const saleItems = itens.map((i) => ({
        sale_id: sale.id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.subtotal,
      }));

      await supabase
        .from("sale_items")
        .insert(saleItems);

    }

    await supabase
      .from("clientes_pendentes")
      .update({ pago: true })
      .eq("id", p.id);

    fetchPendencias();

  };

  const removerPendencia = async (p: Pendente) => {

    if (!confirm(`Deseja remover a pendência de ${p.cliente_nome}?`)) return;

    await supabase
      .from("clientes_pendentes")
      .delete()
      .eq("id", p.id);

    fetchPendencias();

  };

  return (

    <div className="max-w-5xl space-y-6 pb-20">

      <h1 className="text-3xl font-bold">
        Clientes Pendentes
      </h1>

      {/* FORMULÁRIO */}

      <div className="bg-white border rounded-xl shadow-sm">

        <div className="border-b px-6 py-4 font-semibold text-lg">
          {editingId ? "Editar Pendência" : "Novo Cliente Pendente"}
        </div>

        <div className="p-6 space-y-6">

          <div className="grid md:grid-cols-3 gap-4 items-center">

            <label className="text-sm font-medium">
              Nome do Cliente:
            </label>

            <Input
              className="md:col-span-2"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Ex: João Silva"
            />

            <label className="text-sm font-medium">
              Data de Retirada:
            </label>

            <Input
              type="date"
              className="md:col-span-2"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />

          </div>

          {/* busca produto */}

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

          {/* itens */}

          {items.map((item) => (

            <div key={item.product_id} className="flex gap-3">

              <span className="w-40">
                {item.product_name}
              </span>

              <Input
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  updateQuantity(item.product_id, Number(e.target.value))
                }
              />

              <span>
                R$ {item.subtotal.toFixed(2)}
              </span>

              <Button
                variant="destructive"
                onClick={() => removeItem(item.product_id)}
              >
                🗑
              </Button>

            </div>

          ))}

          <div className="flex justify-between">

            <b>
              Total: R$ {total.toFixed(2)}
            </b>

            <Button
              onClick={
                editingId
                  ? updatePendencia
                  : savePendencia
              }
            >
              {editingId
                ? "Atualizar Pendência"
                : "Salvar Pendência"}
            </Button>

          </div>

        </div>

      </div>

      {/* LISTA */}

      <h2 className="text-lg font-semibold">
        Pendências
      </h2>

      {pendentes.map((p) => (

        <div key={p.id} className="border rounded-lg">

          <div
            onClick={() => togglePendencia(p.id)}
            className={`p-4 flex justify-between cursor-pointer ${
              p.pago ? "bg-green-50" : ""
            }`}
          >

            <div>

              <p className="font-semibold">
                {p.cliente_nome}
              </p>

              <p className="text-sm text-muted-foreground">
                {new Date(p.data_retirada)
                  .toLocaleDateString("pt-BR")}
              </p>

            </div>

            <div className="flex gap-2 items-center">

              <b>
                R$ {p.total.toFixed(2)}
              </b>

              {!p.pago && (

                <>

                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      editarPendencia(p);
                    }}
                  >
                    Editar
                  </Button>

                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      converterVenda(p);
                    }}
                  >
                    Receber
                  </Button>

                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removerPendencia(p);
                    }}
                  >
                    🗑
                  </Button>

                </>

              )}

              {p.pago && (
                <span className="text-green-600 font-semibold">
                  Pago
                </span>
              )}

            </div>

          </div>

          {openPendencia === p.id && (

            <div className="bg-gray-50 p-4 space-y-2">

              {pendenteItens[p.id]?.map((i) => (

                <div
                  key={i.id}
                  className="flex justify-between"
                >

                  <span>{i.product_name}</span>

                  <span>
                    {i.quantity} x R$ {i.unit_price}
                  </span>

                  <span>
                    R$ {i.subtotal}
                  </span>

                </div>

              ))}

            </div>

          )}

        </div>

      ))}

    </div>
  );
}