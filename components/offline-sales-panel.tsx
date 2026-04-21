"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  WifiOff, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  RefreshCw, 
  ShoppingBag
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OfflineSaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_weight: boolean;
}

interface OfflineSale {
  id: string;
  user_id: string;
  organization_id: string;
  total_amount: number;
  total_value: number;
  payment_method: string;
  created_at: string;
  items: OfflineSaleItem[];
}

interface OfflineSalesPanelProps {
  onSync?: () => void;
}

export function OfflineSalesPanel({ onSync }: OfflineSalesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingSales, setPendingSales] = useState<OfflineSale[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadPendingSales = useCallback(() => {
    if (typeof window !== "undefined") {
      const queue = JSON.parse(
        localStorage.getItem("magnus_lobo_sync_queue") || "[]"
      );
      setPendingSales(queue);
    }
  }, []);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    loadPendingSales();
    const interval = setInterval(loadPendingSales, 3000);
    return () => clearInterval(interval);
  }, [loadPendingSales]);

  useEffect(() => {
    const handleSyncSuccess = () => {
      loadPendingSales();
      onSync?.();
    };

    window.addEventListener("sync-success", handleSyncSuccess);
    return () => window.removeEventListener("sync-success", handleSyncSuccess);
  }, [loadPendingSales, onSync]);

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleManualSync = async () => {
    if (!isOnline || pendingSales.length === 0) return;
    
    setIsSyncing(true);
    try {
      window.dispatchEvent(new CustomEvent("manual-sync-request"));
      await new Promise(resolve => setTimeout(resolve, 2000));
      loadPendingSales();
    } finally {
      setIsSyncing(false);
    }
  };

  if (pendingSales.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all cursor-pointer
          ${isOnline 
            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" 
            : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
          }
        `}
        whileTap={{ scale: 0.95 }}
      >
        <WifiOff className={`h-3.5 w-3.5 ${!isOnline ? "animate-pulse" : ""}`} />
        <span className="text-xs font-bold uppercase tracking-tight">
          {pendingSales.length} pendente{pendingSales.length > 1 ? "s" : ""}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden z-50"
          >
            <div className="bg-stone-50 px-4 py-3 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-stone-500" />
                <h3 className="font-bold text-sm text-stone-700 uppercase tracking-tight">
                  Vendas Offline
                </h3>
              </div>
              
              <div className={`flex items-center gap-1.5 text-xs font-medium ${isOnline ? "text-green-600" : "text-red-500"}`}>
                <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
                {isOnline ? "Online" : "Offline"}
              </div>
            </div>

            <ScrollArea className="max-h-64">
              <div className="p-2 space-y-2">
                {pendingSales.map((sale, index) => (
                  <motion.div
                    key={sale.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-stone-50 rounded-lg p-3 border border-stone-100"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-stone-400" />
                        <span className="text-xs text-stone-500">
                          {formatDateTime(sale.created_at)}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        {sale.payment_method.split(" ")[0]}
                      </Badge>
                    </div>

                    <div className="space-y-1 mb-2">
                      {sale.items.slice(0, 2).map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="flex justify-between text-xs"
                        >
                          <span className="text-stone-600 truncate max-w-[60%]">
                            {item.quantity}x {item.product_name}
                          </span>
                          <span className="text-stone-500 font-medium">
                            {formatCurrency(item.subtotal)}
                          </span>
                        </div>
                      ))}
                      {sale.items.length > 2 && (
                        <span className="text-[10px] text-stone-400">
                          +{sale.items.length - 2} item(ns)
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-stone-200">
                      <span className="text-xs font-bold text-stone-600 uppercase">
                        Total
                      </span>
                      <span className="text-sm font-black text-orange-600">
                        {formatCurrency(sale.total_value)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>

            <div className="bg-stone-50 px-4 py-3 border-t border-stone-100">
              <Button
                onClick={handleManualSync}
                disabled={!isOnline || isSyncing}
                className="w-full h-9 text-xs font-bold uppercase tracking-wide"
                variant={isOnline ? "default" : "secondary"}
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : isOnline ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                    Sincronizar Agora
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3.5 w-3.5 mr-2" />
                    Aguardando Conexao
                  </>
                )}
              </Button>
              
              <p className="text-[10px] text-stone-400 text-center mt-2">
                {isOnline 
                  ? "Vendas serao sincronizadas automaticamente" 
                  : "Conecte-se para sincronizar as vendas"
                }
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}