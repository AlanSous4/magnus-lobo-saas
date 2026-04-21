import { supabase } from "./supabase/client";

export interface PendingSale {
  id: string;
  user_id: string;
  organization_id: string;
  total_amount: number;
  total_value: number;
  payment_method: string;
  created_at: string;
  items: {
    product_id: string;
    product_name: string; // Adicionado para bater com seu banco
    quantity: number;
    unit_price: number;
    subtotal: number;
    is_weight: boolean;   // Adicionado para bater com seu banco
  }[];
}

const QUEUE_KEY = "magnus_lobo_pending_sales";

export const SyncQueue = {
  enqueue: (sale: PendingSale) => {
    const queue = SyncQueue.getQueue();
    queue.push(sale);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  getQueue: (): PendingSale[] => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(QUEUE_KEY);
    return saved ? JSON.parse(saved) : [];
  },

  sync: async () => {
    const queue = SyncQueue.getQueue();
    if (queue.length === 0 || !navigator.onLine) return;

    console.log(`🔄 Sincronizando ${queue.length} vendas pendentes...`);

    for (const sale of queue) {
      try {
        // 1. Prepara os dados da venda principal (removemos 'items' que não vai na tabela sales)
        const { items, ...vendaData } = sale;
        
        const { data: insertedSale, error: saleError } = await supabase
          .from("sales")
          .insert([vendaData])
          .select()
          .single();

        if (saleError) {
          console.error("❌ Erro na tabela SALES:", JSON.stringify(saleError, null, 2));
          break; 
        }

        // 2. Prepara os itens incluindo os campos product_name e is_weight
        const itemsToInsert = items.map(item => ({
          sale_id: insertedSale.id,
          product_id: item.product_id,
          product_name: item.product_name, // Agora batendo com sua SQL
          organization_id: sale.organization_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          is_weight: item.is_weight // Agora batendo com sua SQL
        }));

        const { error: itemsError } = await supabase
          .from("sale_items")
          .insert(itemsToInsert);

        if (itemsError) {
          console.error("❌ Erro na tabela SALE_ITEMS:", JSON.stringify(itemsError, null, 2));
          break;
        }

        // 3. Sucesso: Remove da fila local
        const currentQueue = SyncQueue.getQueue();
        const updatedQueue = currentQueue.filter(s => s.id !== sale.id);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(updatedQueue));
        
        console.log(`✅ Venda ${sale.id} sincronizada com sucesso!`);

      } catch (err) {
        console.error("❌ Erro crítico na sincronização:", err);
        break; 
      }
    }
  }
};