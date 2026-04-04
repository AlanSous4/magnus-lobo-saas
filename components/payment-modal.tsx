"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"

interface Payment {
  metodo: string
  valor: number
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  total: number
  onConfirm: (pagamentos: Payment[]) => Promise<void>
  mesaInfo?: string // Opcional: "Mesa 05", "Comanda 12", etc.
}

export function PaymentModal({ isOpen, onClose, total, onConfirm, mesaInfo }: PaymentModalProps) {
  const [pagamentos, setPagamentos] = useState<Payment[]>([])
  const [metodoSelecionado, setMetodoSelecionado] = useState("pix")
  const [valorInput, setValorInput] = useState("")
  const [processando, setProcessando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor, 0)
  const saldoRestante = Math.max(0, total - totalPago)

  // Resetar modal ao abrir
  useEffect(() => {
    if (isOpen) {
      setPagamentos([])
      setSucesso(false)
      setValorInput(total.toFixed(2))
    }
  }, [isOpen, total])

  const adicionarPagamento = () => {
    const valor = parseFloat(valorInput)
    if (isNaN(valor) || valor <= 0) return

    setPagamentos([...pagamentos, { metodo: metodoSelecionado, valor }])
    setValorInput(Math.max(0, saldoRestante - valor).toFixed(2))
  }

  const removerPagamento = (index: number) => {
    const novos = pagamentos.filter((_, i) => i !== index)
    setPagamentos(novos)
    const novoTotalPago = novos.reduce((acc, p) => acc + p.valor, 0)
    setValorInput((total - novoTotalPago).toFixed(2))
  }

  const finalizar = async () => {
    setProcessando(true)
    try {
      await onConfirm(pagamentos)
      setSucesso(true)
      // Fecha o modal automaticamente após 2 segundos de sucesso
      setTimeout(() => {
        onClose()
      }, 2500)
    } catch (error) {
      console.error(error)
    } finally {
      setProcessando(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
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
                  <div className={`p-3 rounded-xl text-center bg-stone-100 transition-all ${!(pagamentos.length > 0 && saldoRestante > 0.01) && "col-span-2"}`}>
                    <span className="text-[10px] font-black uppercase text-stone-500 block mb-1">Total</span>
                    <p className="text-xl font-black text-stone-800 font-mono italic">R$ {total.toFixed(2)}</p>
                  </div>

                  {pagamentos.length > 0 && saldoRestante > 0.01 && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center">
                      <span className="text-[10px] font-black uppercase text-orange-600 block mb-1">Falta</span>
                      <p className="text-xl font-black text-orange-700 font-mono italic">R$ {saldoRestante.toFixed(2)}</p>
                    </motion.div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {["pix", "crédito", "débito", "dinheiro", "va", "vr"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMetodoSelecionado(m)}
                      className={`cursor-pointer py-2 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${metodoSelecionado === m ? "border-orange-500 bg-orange-50 text-orange-700" : "border-stone-100 text-stone-400"}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 mb-6">
                  <input
                    type="number"
                    step="0.01"
                    value={valorInput}
                    onChange={(e) => setValorInput(e.target.value)}
                    className="flex-1 bg-stone-100 rounded-xl p-4 font-black text-lg focus:outline-orange-500"
                    placeholder="0.00"
                  />
                  <button onClick={adicionarPagamento} className="bg-stone-800 text-white px-6 rounded-xl font-black text-[10px] uppercase hover:bg-black active:scale-95 cursor-pointer">
                    Add
                  </button>
                </div>

                <div className="space-y-2 mb-6 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                  <AnimatePresence mode="popLayout">
                    {pagamentos.map((p, idx) => (
                      <motion.div key={idx} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} layout className="flex justify-between items-center bg-stone-50 p-3 rounded-xl border border-stone-100">
                        <span className="font-black text-stone-500 uppercase text-[10px]">{p.metodo}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-stone-800 text-sm">R$ {p.valor.toFixed(2)}</span>
                          <button onClick={() => removerPagamento(idx)} className="text-red-500 font-bold hover:bg-red-50 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer">✕</button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={finalizar}
                    disabled={saldoRestante > 0.01 || processando || total <= 0}
                    className="cursor-pointer w-full bg-green-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg disabled:opacity-20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {processando ? "FINALIZANDO..." : "CONCLUIR VENDA"}
                  </button>
                  <button onClick={onClose} className="text-stone-400 font-black py-2 uppercase text-[10px] tracking-widest hover:text-stone-600 cursor-pointer">
                    Voltar
                  </button>
                </div>
              </>
            ) : (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.5 }} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-stone-800 uppercase italic">Venda Concluída!</h3>
                {mesaInfo && <p className="text-stone-400 font-bold text-sm mt-2 uppercase tracking-tighter">{mesaInfo} Liberada</p>}
                <div className="w-full h-1 bg-stone-100 mt-8 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2 }} className="h-full bg-green-500" />
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}