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
};

export default function ClientesPendentesClient() {
  const [cliente, setCliente] = useState("");
  const [data, setData] = useState("");

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  const [items, setItems] = useState<Item[]>([]);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);

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

    const { data: pendente, error } = await supabase
      .from("clientes_pendentes")
      .insert({
        cliente_nome: cliente,
        total,
        data_retirada: data,
        user_id: user?.id,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

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

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      <h1 className="text-3xl font-bold">
        Clientes Pendentes
      </h1>

      <div className="bg-white border rounded-xl shadow-sm">

        {/* HEADER */}

        <div className="border-b px-6 py-4 font-semibold text-lg">
          Novo Cliente Pendente
        </div>

        <div className="p-6 space-y-6">

          {/* CLIENTE */}

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

          {/* BUSCA */}

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

          {/* TABELA */}

          <div className="border rounded-lg overflow-hidden">

            <div className="grid grid-cols-5 bg-gray-50 px-4 py-2 text-sm font-semibold">

              <span>Produto</span>
              <span>Qtd</span>
              <span>Valor Unitário</span>
              <span>Subtotal</span>
              <span></span>

            </div>

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

          {/* DATA + TOTAL */}

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div className="flex items-center gap-3">

              <span className="text-sm font-medium">
                Data da Retirada:
              </span>

              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-45"
              />

            </div>

            <div className="text-xl font-bold">
              Total: R$ {total.toFixed(2)}
            </div>

          </div>

          {/* BOTÕES */}

          <div className="flex justify-end gap-3 pt-4 border-t">

            <Button
              variant="outline"
              onClick={() => {
                setCliente("");
                setItems([]);
                setTotal(0);
              }}
            >
              Cancelar
            </Button>

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

          <div
            key={p.id}
            className="border rounded-lg p-4 flex justify-between items-center"
          >

            <div>

              <p className="font-semibold">
                {p.cliente_nome}
              </p>

              <p className="text-sm text-muted-foreground">
                {new Date(p.data_retirada).toLocaleDateString("pt-BR")}
              </p>

            </div>

            <div className="font-bold">
              R$ {p.total.toFixed(2)}
            </div>

          </div>

        ))}

      </div>

    </div>
  );
}