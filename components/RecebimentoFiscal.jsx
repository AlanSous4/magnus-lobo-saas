"use client";

import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
// Importando a constante supabase diretamente conforme seu arquivo client.ts
import { supabase } from "@/lib/supabase/client";
import "./RecebimentoFiscal.css";

const RecebimentoFiscal = ({ organizationId }) => {
  const [scannedResult, setScannedResult] = useState("");
  const [status, setStatus] = useState("Aguardando scan...");
  const [showScanner, setShowScanner] = useState(false); // Adicione esta linha

  const [modalNovoProd, setModalNovoProd] = useState({ open: false, nomeNota: "" });
  const [novoNomeEstoque, setNovoNomeEstoque] = useState("");

  // --- FUNÇÃO DE ARQUIVO XML ATUALIZADA E COMPLETA ---
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const xmlText = e.target.result;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");

      try {
        const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
        const chave = infNFe.getAttribute("Id").replace("NFe", "");

        // 1. Dados do Emitente (Fornecedor)
        const emit = xmlDoc.getElementsByTagName("emit")[0];
        const fornecedorNome =
          emit.getElementsByTagName("xNome")[0].textContent;

        // 2. Processamento Detalhado dos Itens
        const detNodes = xmlDoc.getElementsByTagName("det");
        const itensFormatados = [];
        let acumuladorTotalICMS = 0;

        for (let i = 0; i < detNodes.length; i++) {
          const det = detNodes[i];
          const prod = det.getElementsByTagName("prod")[0];
          const imposto = det.getElementsByTagName("imposto")[0];

          // Nome, Qtd e Valor Unitário
          const xProd = prod
            .getElementsByTagName("xProd")[0]
            .textContent.trim();
          const qCom = prod.getElementsByTagName("qCom")[0].textContent;
          const vUnCom = prod.getElementsByTagName("vUnCom")[0].textContent;

          // Captura de impostos por item para somar no total
          const icmsNode = imposto.getElementsByTagName("ICMS")[0];
          if (icmsNode) {
            const vICMS = parseFloat(
              icmsNode.getElementsByTagName("vICMS")[0]?.textContent || 0
            );
            acumuladorTotalICMS += vICMS;
          }

          // Busca a Unidade de Medida (UN, CX, KG, etc)
          const uCom = prod.getElementsByTagName("uCom")[0].textContent;
          // Busca o CFOP do item
          const cfopItem = prod.getElementsByTagName("CFOP")[0].textContent;

          itensFormatados.push({
            nome: xProd,
            qtd: qCom,
            unid: uCom, // Novo campo
            cfop: cfopItem, // Novo campo
            valor: "R$ " + parseFloat(vUnCom).toFixed(2).replace(".", ","),
            vUnReal: parseFloat(vUnCom),
          });
        }

        // 3. Totais da Nota
        const totalNode = xmlDoc.getElementsByTagName("ICMSTot")[0];
        const vNF = totalNode.getElementsByTagName("vNF")[0].textContent;
        const vBC = totalNode.getElementsByTagName("vBC")[0].textContent;

        setScannedResult(chave);
        setNotaDados({
          fornecedor: fornecedorNome,
          itens: itensFormatados,
          fiscal: {
            base: "R$ " + parseFloat(vBC).toFixed(2).replace(".", ","),
            icms: "R$ " + acumuladorTotalICMS.toFixed(2).replace(".", ","),
            cfop: detNodes[0]
              .getElementsByTagName("prod")[0]
              .getElementsByTagName("CFOP")[0].textContent,
          },
        });

        setStatus("XML importado com sucesso!");
      } catch (err) {
        console.error("Erro ao processar XML:", err);
        alert("O arquivo XML parece ser inválido ou não é uma NF-e.");
      }
    };
    reader.readAsText(file);
  };

  // Estados para persistência e vínculo
  const [vinculos, setVinculos] = useState({}); // Mapeia { "Nome na NF": "ID_do_Produto_no_Estoque" }
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [meusProdutos, setMeusProdutos] = useState([]); // Lista de produtos do seu banco para o Select

  const [notaDados, setNotaDados] = useState({
    fornecedor: "Aguardando leitura...",
    itens: [],
    fiscal: {
      base: "---",
      icms: "---",
      ipi: "---",
      cfop: "---",
      pis: "---",
      cofins: "---",
    },
  });

  const abrirModalCadastro = (nomeNaNota) => {
    setNovoNomeEstoque(nomeNaNota);
    setModalNovoProd({ open: true, nomeNota: nomeNaNota });
  };
  
  // Esta será a função chamada pelo botão "Salvar" do modal
  const confirmarCadastroRapido = async () => {
    if (!novoNomeEstoque) return;
    
    setIsSaving(true); // Reaproveitando seu estado de loading
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("Sessão expirada.");
  
      const { data: novoProd, error } = await supabase
        .from("products")
        .insert([{
          name: novoNomeEstoque,
          value: 0,
          quantity: 0,
          organization_id: organizationId,
          user_id: user.id,
          is_weight: false,
        }])
        .select().single();
  
      if (error) throw error;
  
      setMeusProdutos((prev) => [...prev, novoProd]);
      setVinculos((prev) => ({ ...prev, [modalNovoProd.nomeNota]: novoProd.id }));
      setModalNovoProd({ open: false, nomeNota: "" }); // Fecha o modal
    } catch (err) {
      alert("Erro: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Inicialização do Scanner (Só executa se showScanner for true)
  useEffect(() => {
    if (!showScanner) return; // Só inicia se o usuário clicar no botão

    const config = {
      fps: 20,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      rememberLastUsedCamera: true,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    };

    const scanner = new Html5QrcodeScanner("reader", config, false);

    const onScanSuccess = (decodedText) => {
      const chaveMatch = decodedText.match(/\d{44}/);
      const chave = chaveMatch ? chaveMatch[0] : null;

      if (chave) {
        if (navigator.vibrate) navigator.vibrate(100);
        processarNota(chave);
        setStatus(`Nota detectada!`);
        setShowScanner(false); // Fecha o scanner automaticamente após ler
      }
    };

    scanner.render(onScanSuccess, (err) => {});

    return () => {
      scanner
        .clear()
        .catch((error) => console.error("Erro ao limpar scanner", error));
    };
  }, [showScanner]); // Importante: monitora a mudança do botão

  // 2. Busca produtos cadastrados (Ajustado para as colunas REAIS da sua tabela)
  useEffect(() => {
    const fetchProdutos = async () => {
      // Busca id e name da sua tabela 'products'
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("organization_id", organizationId) // Filtra pela Padaria Magnus Lobo
        .order("name", { ascending: true });

      if (error) {
        console.error("Erro ao buscar estoque:", error.message);
      } else {
        setMeusProdutos(data || []);
      }
    };

    if (organizationId) fetchProdutos();
  }, [organizationId]); // Deixamos o array vazio para carregar assim que abrir a tela

  const processarNota = (chave) => {
    setScannedResult(chave);
    // Removido o setNotaDados com dados fixos (Mercadinho Sol) para não sobrescrever o XML.
    // No futuro, aqui você faria um fetch(api/consulta-nfe?chave=...)
    setStatus(`Chave ${chave.substring(0, 4)}... detectada!`);
  };
  const handleManualInput = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    setScannedResult(val);
    if (val.length === 44) {
      // Apenas define a chave, sem injetar itens fakes
      setScannedResult(val);
      setStatus("Chave manual inserida.");
    }
  };

  // 3. Função para Salvar no Banco e Atualizar Estoque (Corrigida para Colunas em PT)
  const handleConfirmarEstoque = async () => {
    if (!scannedResult || notaDados.itens.length === 0) return;

    const todosVinculados = notaDados.itens.every(
      (item) => vinculos[item.nome]
    );

    if (!todosVinculados) {
      alert("Por favor, vincule todos os produtos da nota antes de confirmar.");
      return;
    }

    setIsSaving(true);

    try {
      // Dentro de handleConfirmarEstoque:
      const { data: rec, error: recErr } = await supabase
        .from("recebimentos")
        .insert([
          {
            chave_nfe: scannedResult,
            fornecedor_nome: notaDados.fornecedor,
            valor_total: valorTotalNota,
            organization_id: organizationId, // Use organization_id (em inglês)
            status: "confirmado",
          },
        ])
        .select()
        .single();

      if (recErr) throw recErr;

      // B. Processa itens e atualiza estoque
      for (const item of notaDados.itens) {
        const productIdVinculado = vinculos[item.nome];

        // LOG DE SEGURANÇA
        console.log(
          `📦 Processando item: ${item.nome} | ID no Banco: ${productIdVinculado}`
        );

        if (!productIdVinculado) {
          throw new Error(
            `O produto "${item.nome}" não está vinculado a nenhum item do seu estoque. Vincule-o antes de confirmar.`
          );
        }

        // A. Salva o item vinculado na tabela de histórico
        const { error: itemErr } = await supabase
          .from("recebimento_itens")
          .insert({
            recebimento_id: rec.id,
            product_id: productIdVinculado,
            nome_produto_nfe: item.nome,
            quantidade: parseFloat(item.qtd.replace(",", ".")),
            preco_unitario: item.vUnReal,
            // NOVAS COLUNAS ABAIXO:
            cfop: item.cfop,
            vlr_ipi: item.vIPI || 0,
            vlr_pis: item.vPIS || 0,
            vlr_cofins: item.vCOFINS || 0,
            organization_id: organizationId, // Importante manter o vínculo com a Padaria
          });

        if (itemErr) {
          console.error("Erro na tabela recebimento_itens:", itemErr);
          throw new Error(
            `Erro ao salvar item ${item.nome}: ${itemErr.message}`
          );
        }

        // B. Atualiza o estoque via RPC
        const { error: rpcErr } = await supabase.rpc("increment_stock", {
          row_id: productIdVinculado,
          amount: parseFloat(item.qtd.replace(",", ".")),
        });

        if (rpcErr) throw rpcErr;
      }

      // Ativa a animação profissional
      setShowSuccess(true);

      // Aguarda 3 segundos (tempo da animação) e limpa a tela
      setTimeout(() => {
        setShowSuccess(false);
        setScannedResult("");
        setNotaDados({
          fornecedor: "Aguardando leitura...",
          itens: [],
          fiscal: {},
        });
        setVinculos({});
        setStatus("Aguardando nova nota...");
      }, 3000);

      // Limpa tudo após o sucesso
      setScannedResult("");
      setNotaDados({
        fornecedor: "Aguardando leitura...",
        itens: [],
        fiscal: {},
      });
      setVinculos({});
    } catch (err) {
      // Tratamento amigável para nota duplicada
      if (
        err.message?.includes("recebimentos_chave_nfe_key") ||
        err.code === "23505"
      ) {
        alert("⚠️ Esta nota fiscal já foi lançada no sistema anteriormente!");
      } else {
        alert(
          "Erro ao salvar no banco: " + (err.message || "Verifique o console")
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Só calcula se a chave estiver completa (44 dígitos)
  const temNotaValida = scannedResult.length === 44;

  const totalItensNota = temNotaValida ? notaDados.itens.length : 0;

  // Cálculo atualizado para a nova estrutura de itens
  const valorTotalNota = temNotaValida
    ? notaDados.itens.reduce((acc, item) => {
        // Usamos o vUnReal que extraímos no XML para garantir precisão
        const preco = item.vUnReal || 0;
        const qtd = parseFloat(item.qtd) || 0;
        return acc + preco * qtd;
      }, 0)
    : 0;

  // Se o XML tiver o total do ICMS direto na tag fiscal, usamos ele, senão somamos dos itens
  const valorTotalICMS = temNotaValida
    ? parseFloat(
        notaDados.fiscal?.icms
          ?.replace("R$ ", "")
          .replace(/\./g, "")
          .replace(",", ".") || 0
      )
    : 0;

  return (
    <div className="recebimento-container theme-light">
      <header className="main-header">
        <div className="header-spacer"></div>
        <h1>RECEBIMENTO FISCAL</h1>
        <a href="/dashboard" className="btn-voltar">
          <span className="arrow">←</span>{" "}
          <span className="btn-text">Início</span>
        </a>
      </header>

      <main className="main-content">
        <aside className="left-panel">
          <div className="scanner-section card">
            {/* Se showScanner for falso, mostra o botão. Se for verdadeiro, mostra o leitor */}
            {!showScanner ? (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <button
                  className="btn-confirmar"
                  onClick={() => setShowScanner(true)}
                  style={{ width: "100%", marginBottom: "10px" }}
                >
                  Ligar Câmera (Start Scanner)
                </button>
                <p style={{ fontSize: "0.8rem", color: "#666" }}>
                  Câmera desligada
                </p>
              </div>
            ) : (
              <div id="reader"></div>
            )}

            <div className="manual-entry">
              <label>Ou digite/cole a chave (44 dígitos):</label>
              <input
                type="text"
                className={`input-manual ${
                  scannedResult.length === 44 ? "valid" : ""
                }`}
                placeholder="0000 0000 0000 0000..."
                value={scannedResult}
                onChange={handleManualInput}
                maxLength={44}
              />

              {/* --- ADICIONE O BLOCO ABAIXO --- */}
              <div
                style={{
                  marginTop: "15px",
                  borderTop: "1px dashed #eee",
                  paddingTop: "15px",
                }}
              >
                <label
                  style={{
                    color: "#FF6600",
                    fontWeight: "bold",
                    fontSize: "0.85rem",
                  }}
                >
                  Importar via arquivo XML:
                </label>
                <input
                  type="file"
                  accept=".xml"
                  className="cursor-pointer"
                  onChange={handleFileUpload}
                  style={{
                    marginTop: "8px",
                    fontSize: "0.8rem",
                    width: "100%",
                  }}
                />
              </div>
            </div>
            <p className="status-text">{status}</p>
          </div>

          <div className="notes-list card">
            <h2>NOTAS RECENTES</h2>
            <div className="note-item a-conferir">
              <span>Última conferência</span>
              <span className="tag">Concluído</span>
            </div>
          </div>
        </aside>

        <section className="right-panel">
          <div className="summary-header">
            <div className="summary-card">
              <span className="label">Itens na Nota</span>
              <span className="value">{notaDados.itens.length}</span>
            </div>

            <div className="summary-card">
              <span className="label">Total da Compra</span>
              <span className="value orange">
                {valorTotalNota > 0
                  ? valorTotalNota.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : "R$ 0,00"}
              </span>
            </div>

            <div className="summary-card">
              <span className="label">Total ICMS</span>
              <span className="value orange">
                {valorTotalICMS > 0
                  ? valorTotalICMS.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : "R$ 0,00"}
              </span>
            </div>
          </div>

          <div className="detailed-view card">
            <div className="detailed-header">
              <div>
                <h3 style={{ margin: 0 }}>{notaDados.fornecedor}</h3>
                <p className="chave-text">
                  Chave: {scannedResult || "[Aguardando leitura...]"}
                </p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="items-table" style={{ tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    <th style={{ width: "38%" }}>PRODUTO (NOTA VS ESTOQUE)</th>
                    <th style={{ width: "8%", textAlign: "center" }}>CFOP</th>
                    <th style={{ width: "8%", textAlign: "center" }}>UNID</th>
                    <th style={{ width: "10%", textAlign: "center" }}>QTD</th>
                    <th style={{ width: "18%" }}>V. UNIT</th>
                    <th style={{ width: "18%" }}>V. TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {notaDados.itens.map((item, index) => (
                    <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "8px 0" }}>
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span
                            style={{
                              fontSize: "0.65rem",
                              color: "#888",
                              fontWeight: "bold",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item.nome}
                          </span>
                          <select
                            className="select-vinculo"
                            value={vinculos[item.nome] || ""}
                            onChange={(e) => {
                              if (e.target.value === "NOVO") {
                                abrirModalCadastro(item.nome);
                              } else {
                                setVinculos((prev) => ({
                                  ...prev,
                                  [item.nome]: e.target.value,
                                }));
                              }
                            }}
                            style={{
                              fontSize: "0.8rem",
                              padding: "2px",
                              border: vinculos[item.nome]
                                ? "1px solid #28a745"
                                : "1px solid #FF6600",
                            }}
                          >
                            <option value="">Vincular ao estoque...</option>
                            <option
                              value="NOVO"
                              style={{ fontWeight: "bold", color: "#007bff" }}
                            >
                              + CADASTRAR COMO NOVO PRODUTO
                            </option>
                            {meusProdutos.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td style={{ textAlign: "center", fontSize: "0.8rem" }}>
                        {item.cfop}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          fontSize: "0.8rem",
                          fontWeight: "600",
                        }}
                      >
                        {item.unid}
                      </td>
                      <td style={{ textAlign: "center", fontSize: "0.9rem" }}>
                        {parseFloat(item.qtd)}
                      </td>
                      <td style={{ fontSize: "0.9rem" }}>
                        R$ {item.vUnReal.toFixed(2).replace(".", ",")}
                      </td>
                      <td style={{ fontSize: "0.9rem", fontWeight: "bold" }}>
                        R${" "}
                        {(parseFloat(item.qtd) * item.vUnReal)
                          .toFixed(2)
                          .replace(".", ",")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="detailed-footer">
              <div className="fiscal-summary">
                <div className="fiscal-field">
                  <span className="label">Base ICMS:</span>
                  <span className="value">
                    {notaDados.fiscal?.base || "---"}
                  </span>
                </div>
                <div className="fiscal-field">
                  <span className="label">Vlr ICMS:</span>
                  <span className="value">
                    {notaDados.fiscal?.icms || "---"}
                  </span>
                </div>
                <div className="fiscal-field">
                  <span className="label">CFOP Nota:</span>
                  <span className="value">
                    {notaDados.fiscal?.cfop || "---"}
                  </span>
                </div>
              </div>
              <button
                className="btn-confirmar"
                disabled={scannedResult.length !== 44 || isSaving}
                onClick={handleConfirmarEstoque}
              >
                {isSaving ? "Gravando..." : "Confirmar Estoque"}
              </button>
            </footer>
          </div>
        </section>
      </main>

      <nav className="bottom-nav">
        <a href="/produtos" className="nav-item">
          Estoque
        </a>
        <a href="/vendas" className="nav-item">
          Vendas
        </a>
        <a href="/recebimento" className="nav-item active">
          Recebimento
        </a>
      </nav>

      {/* Overlay de Sucesso Animado */}
      {showSuccess && (
        <div className="loading-overlay">
          <div className="success-checkmark">
            <div className="check-icon">
              <span className="icon-line line-tip"></span>
              <span className="icon-line line-long"></span>
              <div className="icon-circle"></div>
              <div className="icon-fix"></div>
            </div>
          </div>
          <h2 className="success-text">Estoque Atualizado!</h2>
          <p style={{ color: "#666" }}>Padaria Magnus Lobo</p>
        </div>
      )}

{modalNovoProd.open && (
  <div className="modal-overlay">
    <div className="modal-content">
      <h3>Novo Produto</h3>
      <p style={{ fontSize: "0.85rem", color: "#666" }}>
        Como deseja salvar este item no seu estoque?
      </p>
      
      <input 
        type="text" 
        value={novoNomeEstoque}
        onChange={(e) => setNovoNomeEstoque(e.target.value)}
        placeholder="Nome do produto"
        autoFocus
      />

      <div className="modal-actions">
        <button 
          className="btn-voltar" 
          onClick={() => setModalNovoProd({ open: false, nomeNota: "" })}
          style={{ background: "#eee", color: "#333" }}
        >
          Cancelar
        </button>
        <button 
          className="btn-confirmar" 
          onClick={confirmarCadastroRapido}
          disabled={isSaving}
        >
          {isSaving ? "Salvando..." : "Cadastrar e Vincular"}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default RecebimentoFiscal;
