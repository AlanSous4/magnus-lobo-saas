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

  // --- COPIE A PARTIR DAQUI ---
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const xmlText = e.target.result;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");

      try {
        // Busca a chave (ID da tag infNFe) e limpa o prefixo 'NFe'
        const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
        const chave = infNFe.getAttribute("Id").replace("NFe", "");
        
        // Busca o nome do emitente (Fornecedor)
        const fornecedor = xmlDoc.getElementsByTagName("xNome")[0].textContent;

        // Busca os itens (produtos)
        const detNodes = xmlDoc.getElementsByTagName("det");
        const itensFormatados = [];

        for (let i = 0; i < detNodes.length; i++) {
          const prod = detNodes[i].getElementsByTagName("prod")[0];
          itensFormatados.push({
            nome: prod.getElementsByTagName("xProd")[0].textContent,
            qtd: prod.getElementsByTagName("qCom")[0].textContent,
            valor: "R$ " + parseFloat(prod.getElementsByTagName("vUnCom")[0].textContent).toFixed(2).replace(".", ","),
          });
        }

        // Busca Totais Fiscais
        const total = xmlDoc.getElementsByTagName("ICMSTot")[0];

        setScannedResult(chave);
        setNotaDados({
          fornecedor: fornecedor,
          itens: itensFormatados,
          fiscal: {
            base: "R$ " + total.getElementsByTagName("vBC")[0].textContent,
            icms: "R$ " + total.getElementsByTagName("vICMS")[0].textContent,
            cfop: detNodes[0].getElementsByTagName("prod")[0].getElementsByTagName("CFOP")[0].textContent,
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

  // 2. Busca produtos cadastrados para o Select de Vínculo
  useEffect(() => {
    const fetchProdutos = async () => {
      if (!organizationId) return;

      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name")
          .eq("organization_id", organizationId);

        if (error) {
          console.error("Erro do Supabase ao carregar produtos:", error);
        } else if (data) {
          setMeusProdutos(data);
        }
      } catch (err) {
        console.error("Erro inesperado ao buscar produtos:", err);
      }
    };

    fetchProdutos();
  }, [organizationId]);

  const processarNota = (chave) => {
    setScannedResult(chave);
    // Simulação de dados
    setNotaDados({
      fornecedor: "Mercadinho Sol",
      itens: [
        { nome: "Farinha de Trigo", qtd: "10", valor: "R$ 50,00" },
        { nome: "Leite Integral", qtd: "20", valor: "R$ 80,00" },
      ],
      fiscal: {
        base: "R$ 50,00",
        icms: "R$ 6,00",
        ipi: "R$ 2,50",
        cfop: "5102",
        pis: "R$ 1,10",
        cofins: "R$ 4,50",
      },
    });
  };

  const handleManualInput = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    setScannedResult(val);
    if (val.length === 44) {
      processarNota(val);
      setStatus("Chave manual validada!");
    }
  };

  // 3. Função para Salvar no Banco e Atualizar Estoque
  const handleConfirmarEstoque = async () => {
    if (!scannedResult || notaDados.itens.length === 0) return;

    const todosVinculados = notaDados.itens.every(
      (item) => vinculos[item.nome]
    );
    if (!todosVinculados) {
      alert(
        "Por favor, vincule todos os produtos da nota aos produtos do seu estoque antes de confirmar."
      );
      return;
    }

    setIsSaving(true);

    try {
      // A. Salva o cabeçalho
      const { data: rec, error: recErr } = await supabase
        .from("recebimentos")
        .insert([
          {
            chave_nfe: scannedResult,
            fornecedor_nome: notaDados.fornecedor,
            valor_total: 130.0,
            organization_id: organizationId,
            status: "confirmado",
          },
        ])
        .select()
        .single();

      if (recErr) throw recErr;

      // B. Processa itens e atualiza estoque
      for (const item of notaDados.itens) {
        const productIdVinculado = vinculos[item.nome];

        if (productIdVinculado) {
          // Salva item do recebimento
          const { error: itemErr } = await supabase
            .from("recebimento_itens")
            .insert({
              recebimento_id: rec.id,
              product_id: productIdVinculado,
              nome_produto_nfe: item.nome,
              quantidade: parseFloat(item.qtd),
              preco_unitario: parseFloat(
                item.valor.replace("R$ ", "").replace(",", ".")
              ),
            });

          if (itemErr) throw itemErr;

          // Atualiza estoque real via RPC
          const { error: rpcErr } = await supabase.rpc("increment_stock", {
            row_id: productIdVinculado,
            amount: parseFloat(item.qtd),
          });

          if (rpcErr) throw rpcErr;
        }
      }

      alert("Estoque da Padaria Magnus Lobo atualizado com sucesso!");
      setScannedResult("");
      setNotaDados({
        fornecedor: "Aguardando leitura...",
        itens: [],
        fiscal: {},
      });
      setVinculos({});
    } catch (err) {
      alert("Erro ao salvar no banco: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

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
              <div style={{ marginTop: "15px", borderTop: "1px dashed #eee", paddingTop: "15px" }}>
                <label style={{ color: "#FF6600", fontWeight: "bold", fontSize: "0.85rem" }}>
                  Importar via arquivo XML:
                </label>
                <input
                  type="file"
                  accept=".xml"
                  className="cursor-pointer"
                  onChange={handleFileUpload}
                  style={{ marginTop: "8px", fontSize: "0.8rem", width: "100%" }}
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
              <span className="label">Total Notas</span>
              <span className="value">13</span>
            </div>
            <div className="summary-card">
              <span className="label">Total Compras</span>
              <span className="value orange">R$ 5.420</span>
            </div>
            <div className="summary-card">
              <span className="label">Total ICMS</span>
              <span className="value orange">R$ 325</span>
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
              <table className="items-table">
                <thead>
                  <tr>
                    <th>PRODUTO (NOTA VS ESTOQUE)</th>
                    <th>QTD</th>
                    <th>VALOR</th>
                  </tr>
                </thead>
                <tbody>
                  {notaDados.itens.length > 0 ? (
                    notaDados.itens.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: "#888",
                                fontWeight: "bold",
                              }}
                            >
                              {item.nome}
                            </span>
                            <select
                              className="select-vinculo"
                              value={vinculos[item.nome] || ""}
                              onChange={(e) =>
                                setVinculos({
                                  ...vinculos,
                                  [item.nome]: e.target.value,
                                })
                              }
                              style={{
                                padding: "6px",
                                borderRadius: "6px",
                                fontSize: "0.8rem",
                                border: vinculos[item.nome]
                                  ? "1px solid #28a745"
                                  : "1px solid #FF6600",
                                background: vinculos[item.nome]
                                  ? "#f6fff8"
                                  : "#fff",
                                outline: "none",
                              }}
                            >
                              <option value="">Vincular ao estoque...</option>
                              {meusProdutos.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td>{item.qtd}</td>
                        <td>{item.valor}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="3"
                        style={{
                          textAlign: "center",
                          padding: "2rem",
                          color: "#999",
                        }}
                      >
                        Nenhum item carregado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="detailed-footer">
              <div className="fiscal-summary">
                <div className="fiscal-field">
                  <span className="label">Base ICMS:</span>
                  <span className="value">
                    {notaDados.fiscal.base || "---"}
                  </span>
                </div>
                <div className="fiscal-field">
                  <span className="label">Vlr ICMS:</span>
                  <span className="value">
                    {notaDados.fiscal.icms || "---"}
                  </span>
                </div>
                <div className="fiscal-field">
                  <span className="label">CFOP:</span>
                  <span className="value">
                    {notaDados.fiscal.cfop || "---"}
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
    </div>
  );
};

export default RecebimentoFiscal;
