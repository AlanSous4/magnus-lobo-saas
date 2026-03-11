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

  /* ---------------------------
     Buscar produtos
  --------------------------- */

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

  /* ---------------------------
     Buscar pendências
  --------------------------- */

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

  /* ---------------------------
     Filtrar produtos
  --------------------------- */

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

  /* ---------------------------
     Adicionar produto
  --------------------------- */

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

  /* ---------------------------
     Atualizar quantidade
  --------------------------- */

  const updateQuantity = (productId: string, quantity: number) => {

    setItems((prev) =>
      prev.map((item) => {

        if (item.product_id !== productId) return item;

        const subtotal = quantity * item.unit_price;

        return { ...item, quantity, subtotal };

      })
    );

  };

  /* ---------------------------
     Remover item
  --------------------------- */

  const removeItem = (productId: string) => {

    setItems((prev) =>
      prev.filter((item) => item.product_id !== productId)
    );

  };

  /* ---------------------------
     Calcular total
  --------------------------- */

  useEffect(() => {

    const t = items.reduce((acc, item) => acc + item.subtotal, 0);

    setTotal(t);

  }, [items]);

  /* ---------------------------
     Salvar pendência
  --------------------------- */

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

    await supabase.from("clientes_pendentes_itens").insert(itens);

    setCliente("");
    setData("");
    setItems([]);
    setTotal(0);

    fetchPendencias();

  };

  /* ---------------------------
     Abrir / fechar itens
  --------------------------- */

  const togglePendencia = async (id: string) => {

    if (openPendencia === id) {
      setOpenPendencia(null);
      return;
    }

    if (!pendenteItens[id]) {

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

    }

    setOpenPendencia(id);

  };

  /* ---------------------------
     Converter venda
  --------------------------- */

  const converterVenda = async (p: Pendente) => {

    const itens = pendenteItens[p.id] || [];

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

      await supabase.from("sale_items").insert(saleItems);

    }

    await supabase
      .from("clientes_pendentes")
      .update({ pago: true })
      .eq("id", p.id);

    fetchPendencias();

  };

  return (

    <div className="max-w-5xl mx-auto space-y-6 pb-20">

      <h1 className="text-3xl font-bold">
        Clientes Pendentes
      </h1>

      {/* NOVA PENDÊNCIA */}

      <div className="bg-white border rounded-xl shadow-sm">

        <div className="border-b px-6 py-4 font-semibold text-lg">
          Novo Cliente Pendente
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

          </div>

          {/* BUSCA PRODUTO */}

          <div className="space-y-2 relative">

            <h3 className="font-semibold">
              Adicionar Itens
            </h3>

            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
            />

            {filteredProducts.length > 0 && (

              <div className="absolute bg-white border rounded w-full max-h-40 overflow-auto z-10">

                {filteredProducts.map((p) => (

                  <div
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex justify-between"
                  >

                    <span>{p.name}</span>

                    <span className="text-sm text-muted-foreground">
                      R$ {p.value.toFixed(2)}
                    </span>

                  </div>

                ))}

              </div>

            )}

          </div>

          {/* ITENS */}

          <div className="border rounded-lg overflow-hidden">

            {items.map((item) => (

              <div
                key={item.product_id}
                className="grid grid-cols-5 items-center px-4 py-3 border-t"
              >

                <span>{item.product_name}</span>

                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    updateQuantity(
                      item.product_id,
                      Number(e.target.value)
                    )
                  }
                />

                <span>R$ {item.unit_price.toFixed(2)}</span>

                <span className="font-medium">
                  R$ {item.subtotal.toFixed(2)}
                </span>

                <Button
                  variant="destructive"
                  onClick={() =>
                    removeItem(item.product_id)
                  }
                >
                  🗑
                </Button>

              </div>

            ))}

          </div>

          <div className="flex justify-between items-center">

            <div className="text-xl font-bold">
              Total: R$ {total.toFixed(2)}
            </div>

            <Button
              onClick={savePendencia}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Salvar Pendência
            </Button>

          </div>

        </div>

      </div>

      {/* LISTA */}

      <div className="space-y-2">

        <h2 className="text-lg font-semibold">
          Pendências
        </h2>

        {pendentes.map((p) => (

          <div key={p.id} className="border rounded-lg overflow-hidden">

            <div
              onClick={() => togglePendencia(p.id)}
              className={`p-4 flex justify-between items-center cursor-pointer ${
                p.pago ? "bg-green-50" : ""
              }`}
            >

              <div>

                <p className="font-semibold">
                  {p.cliente_nome}
                </p>

                <p className="text-sm text-muted-foreground">
                  {new Date(p.data_retirada).toLocaleDateString("pt-BR")}
                </p>

              </div>

              <div className="flex items-center gap-4">

                <span className="font-bold">
                  R$ {p.total.toFixed(2)}
                </span>

                {!p.pago && (

                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      converterVenda(p);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Converter Venda
                  </Button>

                )}

                {p.pago && (
                  <span className="text-green-600 font-semibold">
                    Pago
                  </span>
                )}

              </div>

            </div>

            {openPendencia === p.id && pendenteItens[p.id] && (

              <div className="border-t bg-gray-50 p-4 space-y-2">

                {pendenteItens[p.id].map((i) => (

                  <div
                    key={i.id}
                    className="flex justify-between text-sm"
                  >

                    <span>
                      {i.product_name} x{i.quantity}
                    </span>

                    <span>
                      R$ {i.subtotal.toFixed(2)}
                    </span>

                  </div>

                ))}

              </div>

            )}

          </div>

        ))}

      </div>

    </div>
  );
}