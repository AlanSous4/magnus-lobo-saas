"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface DeleteProductButtonProps {
  productId: string;
  productName?: string; // Adicionei opcional para o modal ficar dinâmico
}

export function DeleteProductButton({ productId, productName }: DeleteProductButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    // Previne que o AlertDialog feche antes de terminarmos a requisição
    e.preventDefault();
    setIsLoading(true);

    try {
      // Executa o Soft Delete (Update)
      const { data, error } = await supabase
        .from("products")
        .update({
          active: false,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", productId)
        .select(); // Essencial para confirmar se a RLS permitiu a alteração

      if (error) throw error;

      // Se o data voltar vazio, a RLS barrou o update silenciosamente (Erro 42501 comum)
      if (!data || data.length === 0) {
        throw new Error("Permissão negada ou produto não encontrado. Verifique as políticas de RLS no banco.");
      }

      toast.success("Produto removido com sucesso!");
      
      setOpen(false); // Fecha o modal apenas no sucesso
      
      // Força o Next.js a revalidar os dados da página
      router.refresh();

    } catch (err: any) {
      // Log detalhado para depuração em produção
      const errorMessage = err.message || "Erro inesperado ao excluir";
      
      console.error("[PRODUÇÃO] Erro detalhado:", {
        message: errorMessage,
        details: err.details,
        hint: err.hint,
        code: err.code
      });

      toast.error(`Falha ao excluir: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive cursor-pointer"
          title="Excluir produto"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja remover <strong>{productName || "este produto"}</strong>? 
            <br /><br />
            Ele será ocultado da lista, mas os registros de vendas e recebimentos antigos serão preservados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel 
            className="cursor-pointer" 
            disabled={isLoading}
          >
            Cancelar
          </AlertDialogCancel>
          
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer min-w-35"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              "Confirmar Exclusão"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}