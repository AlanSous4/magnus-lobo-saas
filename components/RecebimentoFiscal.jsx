import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../supabaseClient'; // Ajuste o caminho conforme seu projeto
import './RecebimentoFiscal.css'; // Vamos criar este arquivo de estilo

const RecebimentoFiscal = ({ organizationId }) => {
  const [scannedResult, setScannedResult] = useState(null);
  const [status, setStatus] = useState('Aguardando scan...');

  useEffect(() => {
    // Configuração do Scanner
    const scanner = new Html5QrcodeScanner('reader', {
      fps: 10, // Quadros por segundo
      qrbox: { width: 250, height: 250 }, // Tamanho da área de leitura
    });

    // Função chamada quando um QR Code é lido com sucesso
    const onScanSuccess = (decodedText, decodedResult) => {
      //decodedText é a URL da nota. Vamos extrair a chave de 44 dígitos
      const chaveMatch = decodedText.match(/\d{44}/);
      const chave = chaveMatch ? chaveMatch[0] : null;

      if (chave) {
        setScannedResult(chave);
        setStatus(`Nota bipada! Chave: ${chave.substring(0,4)}...`);
        // Aqui chamaremos a função para salvar no Supabase futuramente
        // salvarNotaNoSupabase(chave, organizationId);
      } else {
        setStatus('QR Code lido, mas não parece ser uma nota fiscal válida.');
      }
      
      // Opcional: Parar o scanner após o sucesso
      // scanner.clear(); 
    };

    const onScanFailure = (error) => {
      // Falhas normais de leitura (ex: câmera mexeu). Geralmente ignoramos.
      // console.warn(`Code scan error = ${error}`);
    };

    scanner.render(onScanSuccess, onScanFailure);

    // Cleanup: Remove o scanner quando o componente é desmontado
    return () => {
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
  }, []);

  return (
    <div className="recebimento-container theme-light">
      <header className="main-header">
        <h1>RECEBIMENTO FISCAL (FISCAL)</h1>
      </header>

      <div className="main-content">
        {/* COLUNA ESQUERDA: SCANNER E LISTA */}
        <aside className="left-panel">
          <div className="scanner-section card">
            <div id="reader"></div> {/* O scanner será renderizado aqui */}
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

        {/* COLUNA DIREITA: DETALHES E RESUMO */}
        <section className="right-panel detailed-view card">
          <div className="detailed-header">
            <div>
              <h3>Mercadinho Sol</h3>
              <p className="access-key">Chave de Acesso: {scannedResult || "[Aguardando scan]"}</p>
            </div>
            <div className="status-icons">
              <span className="icon icon-bipado"></span> Bipado
              <span className="icon icon-conferido"></span> Conferido
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
              {/* Adicione mais linhas conforme necessário */}
            </tbody>
          </table>

          <footer className="detailed-footer">
            <div className="fiscal-summary">
              <div className="fiscal-field">
                <span className="label">Base ICMS:</span> <span className="value">R$ 50,00</span>
              </div>
              <div className="fiscal-field">
                <span className="label">Vlr ICMS:</span> <span className="value">R$ 6,00</span>
              </div>
              <div className="fiscal-field">
                <span className="label">Vlr IPI:</span> <span className="value">R$ 2,50</span>
              </div>
              <div className="fiscal-field">
                <span className="label">CFOP:</span> <span className="value">5102</span>
              </div>
              <div className="fiscal-field">
                <span className="label">Vlr PIS:</span> <span className="value">R$ 1,10</span>
              </div>
              <div className="fiscal-field">
                <span className="label">Vlr COFINS:</span> <span className="value">R$ 4,50</span>
              </div>
            </div>
            <button className="btn-confirmar">Confirmar Estoque</button>
          </footer>
        </section>
      </div>

      {/* Navegação Inferior */}
      <nav className="bottom-nav">
        <a href="#estoque" className="nav-item">Estoque</a>
        <a href="#vendas" className="nav-item">Vendas</a>
        <a href="#recebimento" className="nav-item active">Recebimento</a>
      </nav>
    </div>
  );
};

export default RecebimentoFiscal;