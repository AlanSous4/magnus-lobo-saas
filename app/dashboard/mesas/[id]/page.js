"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const ORG_ID = "5e391366-d0a5-46fb-8311-f5e86833219d";

export default function DetalheMesaPage() {
  const { id } = useParams();
  const router = useRouter();

  // 1. ESTADOS (States)
  const [mesa, setMesa] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [itensPedido, setItensPedido] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalAberto, setIsModalAberto] = useState(false);
  const [processandoPagamento, setProcessandoPagamento] = useState(false);
  const [pagamentos, setPagamentos] = useState([]);
  const [metodoSelecionado, setMetodoSelecionado] = useState("pix");
  const [valorInput, setValorInput] = useState("");
  const [sucesso, setSucesso] = useState(false);

  // --- LÓGICA DE CÁLCULOS ---
  const totalGeral = itensPedido.reduce(
    (acc, i) => acc + Number(i.preco_unitario) * (Number(i.quantidade) || 1),
    0
  );
  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const saldoRestante = Math.max(0, totalGeral - totalPago);

  // 1. CARREGAMENTO DE DADOS COM AUTO-CORREÇÃO
  useEffect(() => {
    async function carregarDados() {
      if (!id) return;
      setLoading(true);

      try {
        // Busca dados básicos da mesa
        const { data: mesaData } = await supabase
          .from("mesas")
          .select("*")
          .eq("id", id)
          .single();

        // Busca pedido ativo E seus itens em uma única consulta
        const { data: pedidoAtivo } = await supabase
          .from("pedidos_mesa")
          .select("id, itens_pedido_mesa (*)")
          .eq("mesa_id", id)
          .eq("status_pagamento", "pendente")
          .maybeSingle();

        const temItensReais =
          pedidoAtivo?.itens_pedido_mesa &&
          pedidoAtivo.itens_pedido_mesa.length > 0;
        let statusFinal = mesaData?.status;

        // --- LÓGICA DE SINCRONIZAÇÃO RIGOROSA ---
        if (pedidoAtivo && !temItensReais) {
          // Caso 1: Existe pedido mas está vazio (limpa o "fantasma")
          await supabase.from("pedidos_mesa").delete().eq("id", pedidoAtivo.id);
          if (mesaData?.status !== "livre") {
            await supabase
              .from("mesas")
              .update({ status: "livre" })
              .eq("id", id);
          }
          statusFinal = "livre";
          setItensPedido([]);
        } else if (temItensReais) {
          // Caso 2: Tem itens, garante que a mesa está ocupada
          if (mesaData?.status !== "ocupada") {
            await supabase
              .from("mesas")
              .update({ status: "ocupada" })
              .eq("id", id);
          }
          statusFinal = "ocupada";
          setItensPedido(pedidoAtivo.itens_pedido_mesa);
        } else {
          // Caso 3: Não tem pedido nenhum
          if (mesaData?.status !== "livre") {
            await supabase
              .from("mesas")
              .update({ status: "livre" })
              .eq("id", id);
          }
          statusFinal = "livre";
          setItensPedido([]);
        }

        setMesa({ ...mesaData, status: statusFinal });

        // 2. BUSCA O CARDÁPIO JÁ ORDENADO POR NOME
        const { data: produtosData } = await supabase
          .from("products")
          .select("*")
          .eq("organization_id", ORG_ID)
          .order("name", { ascending: true }); // <--- ADICIONADO ORDENAÇÃO

        setProdutos(produtosData || []);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, [id]);

  // 3. LÓGICA DE FILTRO EM TEMPO REAL
  const produtosFiltrados = produtos.filter((prod) => {
    const nome = (prod.name || prod.nome || "").toLowerCase();
    return nome.startsWith(busca.toLowerCase());
    // .startsWith traz apenas o que inicia com a letra.
    // Se quiser que busque no meio da palavra também, use .includes(busca.toLowerCase())
  });

  // Monitora a abertura do modal e o saldo para preencher o input automaticamente
  useEffect(() => {
    if (isModalAberto && saldoRestante > 0) {
      setValorInput(saldoRestante.toFixed(2));
    } else if (!isModalAberto) {
      setValorInput(""); // Limpa quando fecha o modal
    }
  }, [isModalAberto, saldoRestante]);

  const adicionarPagamento = () => {
    const valor = parseFloat(valorInput.toString().replace(",", "."));

    if (isNaN(valor) || valor <= 0) {
      alert("Digite um valor válido.");
      return;
    }

    if (valor > saldoRestante + 0.01) {
      alert("O valor digitado é maior que o saldo restante.");
      return;
    }

    const novosPagamentos = [
      ...pagamentos,
      { metodo: metodoSelecionado, valor },
    ];
    setPagamentos(novosPagamentos);

    // Calcula o novo saldo imediatamente para atualizar o input
    const novoTotalPago = novosPagamentos.reduce((acc, p) => acc + p.valor, 0);
    const novoSaldo = Math.max(0, totalGeral - novoTotalPago);

    setValorInput(novoSaldo > 0 ? novoSaldo.toFixed(2) : "");
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

      const { error: deleteError } = await supabase
        .from("itens_pedido_mesa")
        .delete()
        .eq("id", itemId);
      if (deleteError) throw deleteError;

      const novaLista = itensPedido.filter((item) => item.id !== itemId);
      setItensPedido(novaLista);

      if (novaLista.length === 0) {
        // 2. Usamos a constante que guardamos com segurança
        if (pedidoIdParaLimpar) {
          await supabase
            .from("pedidos_mesa")
            .delete()
            .eq("id", pedidoIdParaLimpar);
        }
        await supabase.from("mesas").update({ status: "livre" }).eq("id", id);
        setMesa((prev) => ({ ...prev, status: "livre" }));
      }
    } catch (err) {
      console.error("Erro ao remover:", err);
    }
  };

  
  const finalizarPedido = async () => {
    if (itensPedido.length === 0) return;

    setProcessandoPagamento(true);
    try {
      const pedidoId = itensPedido[0]?.pedido_id;
      
      // Transforma a lista de pagamentos (Ex: ["PIX", "DINHEIRO"]) em uma string única
      const stringMetodos = pagamentos
        .map((p) => p.metodo.toUpperCase())
        .join(", ");

      // --- AQUI ESTÁ A MUDANÇA PRINCIPAL ---
      // Chamamos a função SQL (RPC) que faz 4 coisas: 
      // 1. Cria Venda | 2. Baixa Estoque | 3. Fecha Pedido | 4. Libera Mesa
      const { error: rpcError } = await supabase.rpc('finalizar_fechamento_mesa', {
        p_pedido_id: pedidoId,
        p_mesa_id: id,         // 'id' vem do useParams() da sua rota
        p_org_id: ORG_ID,      // Sua constante de Organização
        p_total_venda: totalGeral,
        p_metodos_pagamento: stringMetodos
      });

      if (rpcError) throw rpcError;

      // Se não deu erro, mostramos a tela de sucesso
      setSucesso(true);

      // Aguarda 2 segundos para o usuário ver o check de sucesso e redireciona
      setTimeout(() => {
        router.push("/dashboard/mesas");
      }, 2000);

    } catch (err) {
      console.error("Erro ao finalizar conta:", err);
      alert(`Erro técnico: ${err.message || "Verifique o console"}`);
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
          className="cursor-pointer px-4 py-2 bg-white rounded-lg shadow-sm text-sm font-bold"
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-stone-400 uppercase text-xs tracking-widest">
              Cardápio
            </h2>
            {/* --- CAMPO DE BUSCA ADICIONADO AQUI --- */}
            <input
              type="text"
              placeholder="Buscar produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="text-xs p-2 rounded-lg border border-stone-200 focus:outline-orange-400 w-1/2 shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[60vh] pr-1">
            {/* --- MUDANÇA AQUI: de 'produtos.map' para 'produtosFiltrados.map' --- */}
            {produtosFiltrados.map((prod) => (
              <button
                key={prod.id}
                onClick={() => adicionarItem(prod)}
                className="cursor-pointer flex justify-between items-center p-4 bg-white border border-stone-100 rounded-xl hover:border-orange-400 transition-all active:scale-95 shadow-sm"
              >
                <span className="font-bold text-stone-700">
                  {prod.name || prod.nome}
                </span>
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg font-bold text-sm">
                  R$ {Number(prod.value).toFixed(2)}
                </span>
              </button>
            ))}

            {/* Feedback caso não encontre nada */}
            {produtosFiltrados.length === 0 && (
              <p className="text-center text-stone-400 text-sm py-4">
                Nenhum produto encontrado.
              </p>
            )}
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
                      className="text-red-400 hover:text-red-600 p-1 cursor-pointer transition-colors rounded-full"
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
            className="cursor-pointer w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black shadow-lg disabled:opacity-50"
          >
            FECHAR CONTA
          </button>
        </section>
      </div>

      {/* Modal Pagamento com Animações */}
      <AnimatePresence>
        {isModalAberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl overflow-hidden relative"
            >
              {!sucesso ? (
                <>
                  <h2 className="text-2xl font-black mb-6 text-stone-800 italic uppercase">
                    Pagamento
                  </h2>

                  <div className="grid grid-cols-2 gap-2 mb-6">
                    <div
                      className={`p-3 rounded-xl text-center bg-stone-100 transition-all ${
                        !(pagamentos.length > 0 && saldoRestante > 0.01) &&
                        "col-span-2"
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase text-stone-500 block mb-1">
                        Total
                      </span>
                      <p className="text-xl font-black text-stone-800 font-mono italic">
                        R$ {totalGeral.toFixed(2)}
                      </p>
                    </div>

                    {/* Campo Falta: Aparece apenas se houver saldo restante e já houver algum pagamento iniciado */}
                    {pagamentos.length > 0 && saldoRestante > 0.01 && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center"
                      >
                        <span className="text-[10px] font-black uppercase text-orange-600 block mb-1">
                          Falta
                        </span>
                        <p className="text-xl font-black text-orange-700 font-mono italic">
                          R$ {saldoRestante.toFixed(2)}
                        </p>
                      </motion.div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {["pix", "crédito", "débito", "dinheiro", "va", "vr"].map(
                      (m) => (
                        <button
                          key={m}
                          onClick={() => setMetodoSelecionado(m)}
                          className={`cursor-pointer py-2 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${
                            metodoSelecionado === m
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-stone-100 text-stone-400"
                          }`}
                        >
                          {m}
                        </button>
                      )
                    )}
                  </div>

                  <div className="flex gap-2 mb-6">
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={valorInput}
                      onChange={(e) => setValorInput(e.target.value)}
                      className="flex-1 bg-stone-100 rounded-xl p-4 font-black text-lg focus:outline-orange-500 transition-all"
                      placeholder="0.00"
                    />
                    <button
                      onClick={adicionarPagamento}
                      className="bg-stone-800 text-white px-6 rounded-xl font-black text-[10px] uppercase hover:bg-black active:scale-95 transition-all cursor-pointer"
                    >
                      Add
                    </button>
                  </div>

                  <div className="space-y-2 mb-6 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                      {pagamentos.map((p, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          layout
                          className="flex justify-between items-center bg-stone-50 p-3 rounded-xl border border-stone-100"
                        >
                          <span className="font-black text-stone-500 uppercase text-[10px]">
                            {p.metodo}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-stone-800 text-sm">
                              R$ {p.valor.toFixed(2)}
                            </span>
                            <button
                              onClick={() => removerPagamento(idx)}
                              className="text-red-500 font-bold hover:bg-red-50 w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={finalizarPedido}
                      disabled={
                        saldoRestante > 0.01 ||
                        processandoPagamento ||
                        totalGeral <= 0
                      }
                      className="cursor-pointer w-full bg-green-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg disabled:opacity-20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {processandoPagamento ? (
                        <>
                          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          FINALIZANDO...
                        </>
                      ) : (
                        "CONCLUIR VENDA"
                      )}
                    </button>
                    <button
                      onClick={() => setIsModalAberto(false)}
                      className="text-stone-400 font-black py-2 uppercase text-[10px] tracking-widest hover:text-stone-600 transition-colors cursor-pointer"
                    >
                      Voltar
                    </button>
                  </div>
                </>
              ) : (
                /* TELA DE SUCESSO ANIMADA PROFISSIONAL */
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-12 flex flex-col items-center justify-center text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 10,
                      delay: 0.2,
                    }}
                    className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner"
                  >
                    <svg
                      className="w-12 h-12 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </motion.div>
                  <h3 className="text-2xl font-black text-stone-800 uppercase italic">
                    Venda Concluída!
                  </h3>
                  <p className="text-stone-400 font-bold text-sm mt-2 uppercase tracking-tighter">
                    Mesa {mesa?.numero_mesa} Liberada
                  </p>

                  <div className="w-full h-1 bg-stone-100 mt-8 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2 }}
                      className="h-full bg-green-500"
                    />
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
