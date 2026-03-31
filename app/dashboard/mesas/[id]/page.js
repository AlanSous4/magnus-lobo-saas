"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const ORG_ID = "5e391366-d0a5-46fb-8311-f5e86833219d";

export default function DetalheMesaPage() {
  const { id } = useParams();
  const router = useRouter();

  const [mesa, setMesa] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [itensPedido, setItensPedido] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalAberto, setIsModalAberto] = useState(false);
  const [processandoPagamento, setProcessandoPagamento] = useState(false);
  const [pagamentos, setPagamentos] = useState([]);
  const [metodoSelecionado, setMetodoSelecionado] = useState("pix");
  const [valorInput, setValorInput] = useState("");

  // 1. CARREGAMENTO DE DADOS
  useEffect(() => {
    async function carregarDados() {
      if (!id) return;
      setLoading(true);

      try {
        // 1. Busca dados da mesa
        const { data: mesaData } = await supabase
          .from("mesas")
          .select("*")
          .eq("id", id)
          .single();

        // 2. Busca se existe algum pedido pendente para esta mesa
        const { data: temPedido } = await supabase
          .from("pedidos_mesa")
          .select("id")
          .eq("mesa_id", id)
          .eq("status_pagamento", "pendente")
          .maybeSingle();

        // LÓGICA DE SINCRONIZAÇÃO DE STATUS (FORA DE IFS RESTRITIVOS)
        let statusFinal = mesaData?.status;

        if (temPedido && mesaData?.status === "livre") {
          // Se tem pedido no banco mas a mesa consta como livre, atualiza para ocupada
          await supabase
            .from("mesas")
            .update({ status: "ocupada" })
            .eq("id", id);
          statusFinal = "ocupada";
        } 
        else if (!temPedido && mesaData?.status === "ocupada") {
          // Se NÃO tem pedido mas a mesa consta como ocupada, libera a mesa
          await supabase
            .from("mesas")
            .update({ status: "livre" })
            .eq("id", id);
          statusFinal = "livre";
        }

        setMesa({ ...mesaData, status: statusFinal });

        // 3. Busca o cardápio
        const { data: produtosData } = await supabase
          .from("products")
          .select("*")
          .eq("organization_id", ORG_ID);
        setProdutos(produtosData || []);

        // 4. Busca itens do pedido ativo
        const { data: pedidoAtivo } = await supabase
          .from("pedidos_mesa")
          .select("id, itens_pedido_mesa (*)")
          .eq("mesa_id", id)
          .eq("status_pagamento", "pendente")
          .order("aberto_em", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pedidoAtivo?.itens_pedido_mesa) {
          setItensPedido(pedidoAtivo.itens_pedido_mesa);
        } else {
          setItensPedido([]);
        }

      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, [id]);
  // --- LÓGICA DE CÁLCULOS (Declarada apenas uma vez) ---
  const totalGeral = itensPedido.reduce(
    (acc, i) => acc + Number(i.preco_unitario) * (Number(i.quantidade) || 1),
    0
  );
  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const saldoRestante = Math.max(0, totalGeral - totalPago);

  const adicionarPagamento = () => {
    const valor = parseFloat(valorInput.replace(",", "."));
    if (isNaN(valor) || valor <= 0) {
      alert("Digite um valor válido.");
      return;
    }
    if (valor > saldoRestante + 0.01) {
      alert("O valor digitado é maior que o saldo restante.");
      return;
    }
    setPagamentos([...pagamentos, { metodo: metodoSelecionado, valor }]);
    setValorInput("");
  };

  const removerPagamento = (index) => {
    setPagamentos(pagamentos.filter((_, i) => i !== index));
  };

  // 2. ADICIONAR ITEM
  const adicionarItem = async (produto) => {
    try {
      const { data: pedidoExistente } = await supabase
        .from("pedidos_mesa")
        .select("id")
        .eq("mesa_id", id)
        .eq("status_pagamento", "pendente")
        .maybeSingle();

      let pedidoId = pedidoExistente?.id;

      if (!pedidoId) {
        const { data: novoPedido, error: erroP } = await supabase
          .from("pedidos_mesa")
          .insert([
            {
              mesa_id: id,
              organization_id: ORG_ID,
              status_pagamento: "pendente",
              aberto_em: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (erroP) throw erroP;
        pedidoId = novoPedido.id;

        await supabase.from("mesas").update({ status: "ocupada" }).eq("id", id);
        setMesa((prev) => ({ ...prev, status: "ocupada" }));
      }

      const { data: novoItem, error: erroI } = await supabase
        .from("itens_pedido_mesa")
        .insert([
          {
            pedido_id: pedidoId,
            produto_id: produto.id,
            organization_id: ORG_ID,
            quantidade: 1,
            preco_unitario: Number(produto.value) || 0,
            nome_produto: produto.name || produto.nome || "Produto",
          },
        ])
        .select()
        .single();

      if (erroI) throw erroI;
      setItensPedido((prev) => [...prev, novoItem]);
    } catch (err) {
      alert("Erro ao adicionar item.");
    }
  };

  // 3. REMOVER ITEM (Melhorado)
  const removerItem = async (itemId) => {
    try {
      // 1. Guardamos o ID do pedido antes de mexer no estado local
      const pedidoIdParaLimpar = itensPedido[0]?.pedido_id;
  
      const { error: deleteError } = await supabase.from("itens_pedido_mesa").delete().eq("id", itemId);
      if (deleteError) throw deleteError;
  
      const novaLista = itensPedido.filter((item) => item.id !== itemId);
      setItensPedido(novaLista);
  
      if (novaLista.length === 0) {
        // 2. Usamos a constante que guardamos com segurança
        if (pedidoIdParaLimpar) {
          await supabase.from("pedidos_mesa").delete().eq("id", pedidoIdParaLimpar);
        }
        await supabase.from("mesas").update({ status: "livre" }).eq("id", id);
        setMesa((prev) => ({ ...prev, status: "livre" }));
      }
    } catch (err) {
      console.error("Erro ao remover:", err);
    }
  };

  // 4. FINALIZAR PEDIDO (Adicionado tratamento de erro melhor)
const finalizarPedido = async () => {
  if (itensPedido.length === 0) return;
  
  setProcessandoPagamento(true);
  try {
    const pedidoId = itensPedido[0]?.pedido_id;
    const stringMetodos = pagamentos.map(p => p.metodo.toUpperCase()).join(", ");

    // Atualiza o pedido
    const { error: erroPedido } = await supabase.from("pedidos_mesa").update({
      status_pagamento: "pago",
      fechado_em: new Date().toISOString(),
      total_pedido: totalGeral,
      metodo_pagamento: stringMetodos
    }).eq("id", pedidoId);

    if (erroPedido) throw erroPedido;

    // Libera a mesa
    const { error: erroMesa } = await supabase.from("mesas").update({ status: "livre" }).eq("id", id);
    if (erroMesa) throw erroMesa;
    
    alert("Venda finalizada com sucesso!");
    router.push("/dashboard/mesas");
  } catch (err) {
    console.error(err);
    alert("Erro ao finalizar conta. Verifique a conexão.");
  } finally {
    setProcessandoPagamento(false);
  }
};

  if (loading)
    return (
      <div className="p-8 text-center font-bold text-stone-500">
        Sincronizando...
      </div>
    );

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 bg-stone-100 p-4 rounded-xl border border-stone-200">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-white rounded-lg shadow-sm text-sm font-bold"
        >
          ← Voltar
        </button>
        <h1 className="text-xl font-black uppercase">
          MESA {mesa?.numero_mesa}
        </h1>
        <div
          className={`h-4 w-4 rounded-full border-2 border-white shadow ${
            mesa?.status === "ocupada" ? "bg-red-500" : "bg-green-500"
          }`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cardápio */}
        <section className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
          <h2 className="font-black text-stone-400 mb-4 uppercase text-xs tracking-widest">
            Cardápio
          </h2>
          <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[60vh] pr-1">
            {produtos.map((prod) => (
              <button
                key={prod.id}
                onClick={() => adicionarItem(prod)}
                className="flex justify-between items-center p-4 bg-white border border-stone-100 rounded-xl hover:border-orange-400 transition-all active:scale-95 shadow-sm"
              >
                <span className="font-bold text-stone-700">
                  {prod.name || prod.nome}
                </span>
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg font-bold text-sm">
                  R$ {Number(prod.value).toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Consumo */}
        <section className="bg-white border border-stone-200 p-5 rounded-2xl shadow-xl flex flex-col h-fit">
          <h2 className="font-black text-stone-400 mb-4 uppercase text-xs tracking-widest border-b pb-2">
            Consumo Atual
          </h2>
          <div
            className="flex-1 overflow-y-auto min-h-75"
            style={{ maxHeight: "400px" }}
          >
            {itensPedido.length === 0 ? (
              <div className="py-20 text-center text-stone-400 italic">
                Mesa vazia.
              </div>
            ) : (
              Object.values(
                itensPedido.reduce((acc, item) => {
                  const key = item.produto_id;
                  if (!acc[key]) acc[key] = { ...item, ids: [] };
                  acc[key].ids.push(item.id);
                  return acc;
                }, {})
              ).map((agrupado, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-3 border-b border-stone-50"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-stone-800">
                      {agrupado.nome_produto}
                    </span>
                    <span className="text-xs font-bold text-stone-400">
                      {agrupado.ids.length}x de R${" "}
                      {Number(agrupado.preco_unitario).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-stone-900">
                      R${" "}
                      {(
                        agrupado.ids.length * Number(agrupado.preco_unitario)
                      ).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removerItem(agrupado.ids[0])}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-6 pt-4 border-t-4 border-double border-stone-100 flex justify-between items-center">
            <span className="font-black text-stone-400 uppercase text-sm">
              Total:
            </span>
            <span className="text-3xl font-black text-green-700">
              R$ {totalGeral.toFixed(2)}
            </span>
          </div>
          <button
            onClick={() => setIsModalAberto(true)}
            disabled={itensPedido.length === 0}
            className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black shadow-lg disabled:opacity-50"
          >
            FECHAR CONTA
          </button>
        </section>
      </div>

      {/* Modal Pagamento */}
      {isModalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-black mb-4 text-stone-800">
              Finalizar Mesa {mesa?.numero_mesa}
            </h2>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-stone-100 p-3 rounded-xl text-center">
                <span className="text-[10px] font-bold uppercase text-stone-500 block">
                  Total
                </span>
                <p className="text-xl font-black text-stone-800 font-mono">
                  R$ {totalGeral.toFixed(2)}
                </p>
              </div>
              <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center">
                <span className="text-[10px] font-bold uppercase text-orange-600 block">
                  Falta
                </span>
                <p className="text-xl font-black text-orange-700 font-mono">
                  R$ {saldoRestante.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {["pix", "crédito", "débito", "dinheiro", "va", "vr"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMetodoSelecionado(m)}
                  className={`py-2 rounded-lg font-bold text-[10px] uppercase border-2 transition-all ${
                    metodoSelecionado === m
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-stone-100 text-stone-400"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-6">
              <input
                type="number"
                placeholder="Valor"
                value={valorInput}
                onChange={(e) => setValorInput(e.target.value)}
                className="flex-1 bg-stone-100 rounded-xl p-3 font-bold text-lg"
              />
              <button
                onClick={adicionarPagamento}
                className="bg-stone-800 text-white px-4 rounded-xl font-black text-xs uppercase"
              >
                Adicionar
              </button>
            </div>

            <div className="space-y-2 mb-6">
              {pagamentos.map((p, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-green-50 p-2 rounded-xl border border-green-100"
                >
                  <span className="font-bold text-green-800 uppercase text-xs">
                    {p.metodo}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-green-900 text-sm">
                      R$ {p.valor.toFixed(2)}
                    </span>
                    <button
                      onClick={() => removerPagamento(idx)}
                      className="text-red-500 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={finalizarPedido}
                disabled={totalPago < totalGeral - 0.01 || processandoPagamento}
                className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg disabled:opacity-30"
              >
                {processandoPagamento ? "PROCESSANDO..." : "CONCLUIR VENDA"}
              </button>
              <button
                onClick={() => setIsModalAberto(false)}
                className="text-stone-400 font-bold py-2"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
