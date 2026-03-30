"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client"; // Ajuste seu caminho

const ORG_ID = "5e391366-d0a5-46fb-8311-f5e86833219d";

export default function DetalheMesaPage() {
  const { id } = useParams(); // Pega o ID da mesa da URL
  const router = useRouter();

  const [mesa, setMesa] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [itensPedido, setItensPedido] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      setLoading(true);

      try {
        // 1. Busca a mesa específica
        const { data: mesaData } = await supabase
          .from("mesas")
          .select("*")
          .eq("id", id)
          .single();
        setMesa(mesaData);

        // 2. Busca os produtos da sua padaria (Focando no ORG_ID)
        const { data: produtosData, error: prodError } = await supabase
          .from("products")
          .select("*")
          .eq("organization_id", ORG_ID); // <--- Aqui usamos o ID fixo

        if (prodError) throw prodError;
        setProdutos(produtosData || []);

        // 3. Busca itens se a mesa estiver ocupada
        if (mesaData?.status === "ocupada") {
          const { data: pedido } = await supabase
            .from("pedidos_mesa")
            .select("id, itens_pedido_mesa(*)")
            .eq("mesa_id", id)
            .eq("status_pagamento", "pendente")
            .maybeSingle();

          if (pedido) setItensPedido(pedido.itens_pedido_mesa || []);
        }
      } catch (err) {
        console.error("Erro ao carregar dados da mesa:", err);
      } finally {
        setLoading(false);
      }
    }

    if (id) carregarDados();
  }, [id]);

  const adicionarItem = async (produto) => {
    // Lógica para inserir no banco (conforme conversamos antes)
    // Aqui você chama a função de insert no Supabase que discutimos
    console.log("Adicionando:", produto.nome);
    // Dica: Após o insert, você pode dar um refresh na lista local
  };

  if (loading) return <div className="p-8">Carregando detalhes...</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-6 bg-stone-100 p-4 rounded-lg">
        <button
          onClick={() => router.back()}
          className="text-sm font-bold text-brown-600"
        >
          ← Voltar
        </button>
        <h1 className="text-xl font-black">MESA {mesa?.numero_mesa}</h1>
        <div
          className={`h-3 w-3 rounded-full ${
            mesa?.status === "ocupada" ? "bg-red-500" : "bg-green-500"
          }`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Lado Esquerdo: Seu Cardápio para clicar */}
        <section>
          <h2 className="font-bold text-lg mb-4">
            Cardápio (Toque para Adicionar)
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {produtos.map((prod) => (
              <button
                key={prod.id}
                onClick={() => adicionarItem(prod)}
                className="flex justify-between p-3 border rounded-lg hover:bg-orange-50 active:bg-orange-100 transition-colors"
              >
                <span>{prod.nome || prod.name || "Produto sem nome"}</span>
                <span className="font-bold text-orange-500">
                  R$ {(Number(prod.value) || 0).toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Lado Direito: O que já está na mesa */}
        <section className="bg-white border-l p-4 rounded-lg shadow-sm">
          <h2 className="font-bold text-lg mb-4">Consumo Atual</h2>
          {itensPedido.length === 0 ? (
            <p className="text-gray-400 italic">Nenhum item lançado.</p>
          ) : (
            <ul className="space-y-2">
              {itensPedido.map((item, index) => (
                <li key={index} className="flex justify-between border-b pb-1">
                  <span>1x {item.nome_produto}</span>
                  <span>R$ {item.preco_unitario.toFixed(2)}</span>
                </li>
              ))}
              <div className="mt-4 pt-2 border-t-2 border-double font-black text-xl flex justify-between">
                <span>TOTAL:</span>
                <span>
                  R${" "}
                  {itensPedido
                    .reduce((acc, curr) => acc + curr.preco_unitario, 0)
                    .toFixed(2)}
                </span>
              </div>
            </ul>
          )}

          <button className="w-full mt-6 bg-green-600 text-white py-3 rounded-xl font-bold">
            Fechar Conta (Mesa {mesa?.numero_mesa})
          </button>
        </section>
      </div>
    </div>
  );
}
