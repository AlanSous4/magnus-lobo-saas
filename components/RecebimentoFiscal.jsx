"use client";

import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import "./RecebimentoFiscal.css";

const RecebimentoFiscal = ({ organizationId }) => {
  const [scannedResult, setScannedResult] = useState(null);
  const [status, setStatus] = useState("Aguardando scan...");

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    });

    const onScanSuccess = (decodedText) => {
      const chaveMatch = decodedText.match(/\d{44}/);
      const chave = chaveMatch ? chaveMatch[0] : null;

      if (chave) {
        setScannedResult(chave);
        setStatus(`Nota bipada!`);
      } else {
        setStatus("Chave de acesso não encontrada no QR Code.");
      }
    };

    scanner.render(onScanSuccess, () => {});

    return () => {
      scanner
        .clear()
        .catch((error) => console.error("Erro ao limpar scanner", error));
    };
  }, []);

  return (
    <div className="recebimento-container theme-light">
      <header className="main-header">
        {/* Placeholder para equilibrar o flexbox e manter o título no centro */}
        <div className="header-spacer"></div>

        <h1>RECEBIMENTO FISCAL (FISCAL)</h1>

        <a href="/dashboard" className="btn-voltar">
          <span className="arrow">←</span> Voltar ao Início
        </a>
      </header>

      <div className="main-content">
        {/* COLUNA ESQUERDA: SCANNER E LISTA */}
        <aside className="left-panel">
          <div className="scanner-section card">
            <div id="reader"></div>
            <p className="status-text">{status}</p>
          </div>

          <div className="notes-list card">
            <h2>NOTAS RECENTES</h2>
            <div className="note-item a-conferir">
              <span>Mercadinho Sol</span>
              <span className="tag">A Conferir</span>
            </div>
            <div className="note-item bipado">
              <span>Distribuidora Alimentos</span>
              <span className="tag">Bipado</span>
            </div>
          </div>
        </aside>

        {/* COLUNA DIREITA: RESUMO E DETALHES */}
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
                <h3 style={{ margin: 0 }}>Mercadinho Sol</h3>
                <p
                  className="access-key"
                  style={{
                    fontSize: "0.85rem",
                    color: "#777",
                    margin: "5px 0",
                  }}
                >
                  Chave: {scannedResult || "[Aguardando leitura...]"}
                </p>
              </div>
              <div className="status-icons">
                <span className="badge">Bipado</span>
                <span className="badge active">● Conferido</span>
              </div>
            </div>

            <table className="items-table">
              <thead>
                <tr>
                  <th>PRODUTO</th>
                  <th>QTD</th>
                  <th>VALOR</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Farinha de Trigo</td>
                  <td>10kg</td>
                  <td>R$ 50,00</td>
                </tr>
                <tr>
                  <td>Leite Integral</td>
                  <td>20L</td>
                  <td>R$ 80,00</td>
                </tr>
              </tbody>
            </table>

            <footer className="detailed-footer">
              <div className="fiscal-summary">
                <div className="fiscal-field">
                  <span className="label">Base ICMS:</span>{" "}
                  <span className="value">R$ 50,00</span>
                </div>
                <div className="fiscal-field">
                  <span className="label">Vlr ICMS:</span>{" "}
                  <span className="value">R$ 6,00</span>
                </div>
                <div className="fiscal-field">
                  <span className="label">Vlr IPI:</span>{" "}
                  <span className="value">R$ 2,50</span>
                </div>
                <div className="fiscal-field">
                  <span className="label">CFOP:</span>{" "}
                  <span className="value">5102</span>
                </div>
                <div className="fiscal-field">
                  <span className="label">Vlr PIS:</span>{" "}
                  <span className="value">R$ 1,10</span>
                </div>
                <div className="fiscal-field">
                  <span className="label">Vlr COFINS:</span>{" "}
                  <span className="value">R$ 4,50</span>
                </div>
              </div>
              <button className="btn-confirmar">Confirmar Estoque</button>
            </footer>
          </div>
        </section>
      </div>

      <nav className="bottom-nav">
        <a href="/produtos/" className="nav-item">Estoque</a>
        <a href="/vendas" className="nav-item">Vendas</a>
        <a href="/recebimento" className="nav-item active">Recebimento</a>
      </nav>
    </div>
  );
};

export default RecebimentoFiscal;