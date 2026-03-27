"use client";

import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import "./RecebimentoFiscal.css";

const RecebimentoFiscal = ({ organizationId }) => {
  const [scannedResult, setScannedResult] = useState("");
  const [status, setStatus] = useState("Aguardando scan...");

  const [notaDados, setNotaDados] = useState({
    fornecedor: "Aguardando leitura...",
    itens: [],
    fiscal: { base: "---", icms: "---", ipi: "---", cfop: "---", pis: "---", cofins: "---" }
  });

  useEffect(() => {
    const config = {
      fps: 20, // Aumentado para leitura mais rápida
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      rememberLastUsedCamera: true,
      // Removi a restrição de supportedScanTypes para permitir que o scanner use o melhor método disponível
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true // Tenta usar API nativa do celular se disponível
      }
    };

    const scanner = new Html5QrcodeScanner("reader", config, false);

    const onScanSuccess = (decodedText) => {
      // Procura 44 números em qualquer lugar da string (alguns QRs de NF-e vêm com URL junto)
      const chaveMatch = decodedText.match(/\d{44}/);
      const chave = chaveMatch ? chaveMatch[0] : null;

      if (chave) {
        if (navigator.vibrate) navigator.vibrate(100); // Feedback tátil
        processarNota(chave);
        setStatus(`Nota detectada!`);
      } else {
        setStatus("QR Code lido, mas chave não encontrada.");
      }
    };

    scanner.render(onScanSuccess, (err) => {});

    return () => {
      scanner.clear().catch((error) => console.error("Erro ao limpar scanner", error));
    };
  }, []);

  const processarNota = (chave) => {
    setScannedResult(chave);
    setNotaDados({
      fornecedor: "Mercadinho Sol",
      itens: [
        { nome: "Farinha de Trigo", qtd: "10kg", valor: "R$ 50,00" },
        { nome: "Leite Integral", qtd: "20L", valor: "R$ 80,00" }
      ],
      fiscal: { 
        base: "R$ 50,00", icms: "R$ 6,00", ipi: "R$ 2,50", 
        cfop: "5102", pis: "R$ 1,10", cofins: "R$ 4,50" 
      }
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

  return (
    <div className="recebimento-container theme-light">
      <header className="main-header">
        <div className="header-spacer"></div>
        <h1>RECEBIMENTO FISCAL (FISCAL)</h1>
        <a href="/dashboard" className="btn-voltar">
          <span className="arrow">←</span> <span className="btn-text">Início</span>
        </a>
      </header>

      <main className="main-content">
        <aside className="left-panel">
          <div className="scanner-section card">
            <div id="reader"></div>
            
            <div className="manual-entry">
              <label>Ou digite/cole a chave (44 dígitos):</label>
              <input 
                type="text" 
                className={`input-manual ${scannedResult.length === 44 ? "valid" : ""}`}
                placeholder="0000 0000 0000 0000..."
                value={scannedResult}
                onChange={handleManualInput}
                maxLength={44}
              />
            </div>
            
            <p className="status-text">{status}</p>
          </div>

          <div className="notes-list card">
            <h2>NOTAS RECENTES</h2>
            <div className="note-item a-conferir">
              <span>Mercadinho Sol</span>
              <span className="tag">A Conferir</span>
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
              <span className="label">Total ICMS Retido</span>
              <span className="value orange">0</span>
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
                    <th>PRODUTO</th>
                    <th>QTD</th>
                    <th>VALOR</th>
                  </tr>
                </thead>
                <tbody>
                  {notaDados.itens.length > 0 ? (
                    notaDados.itens.map((item, index) => (
                      <tr key={index}>
                        <td>{item.nome}</td>
                        <td>{item.qtd}</td>
                        <td>{item.valor}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ textAlign: "center", padding: "2rem", color: "#999" }}>
                        Nenhum item carregado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="detailed-footer">
              <div className="fiscal-summary">
                <div className="fiscal-field"><span className="label">Base ICMS:</span><span className="value">{notaDados.fiscal.base}</span></div>
                <div className="fiscal-field"><span className="label">Vlr ICMS:</span><span className="value">{notaDados.fiscal.icms}</span></div>
                <div className="fiscal-field"><span className="label">CFOP:</span><span className="value">{notaDados.fiscal.cfop}</span></div>
              </div>
              <button className="btn-confirmar" disabled={scannedResult.length !== 44}>
                Confirmar Estoque
              </button>
            </footer>
          </div>
        </section>
      </main>

      <nav className="bottom-nav">
        <a href="/produtos/" className="nav-item">Estoque</a>
        <a href="/vendas" className="nav-item">Vendas</a>
        <a href="/recebimento" className="nav-item active">Recebimento</a>
      </nav>
    </div>
  );
};

export default RecebimentoFiscal;