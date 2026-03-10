"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  value: number;
  quantity: number;
  expiration_date: string | null;
}

interface EditProductDialogProps {
  product: Product;
}

/* 🔧 Remove timezone da data para usar no input type=date */
function formatDateForInput(date: string | null) {
  if (!date) return "";

  return date.split("T")[0];
}

export function EditProductDialog({ product }: EditProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: product.name,
    value: product.value.toString(),
    quantity: product.quantity.toString(),
    expiration_date: formatDateForInput(product.expiration_date),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("products")
        .update({
          name: formData.name,
          value: parseFloat(formData.value),
          quantity: parseInt(formData.quantity),
          expiration_date: formData.expiration_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id);

      if (error) throw error;

      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar produto");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="cursor-pointer">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
          <DialogDescription>Atualize os dados do produto</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Nome do Produto</Label>
            <Input
              id="edit-name"
              placeholder="Ex: Pão Francês"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-value">Valor (R$)</Label>
              <Input
                id="edit-value"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                required
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-quantity">Quantidade</Label>
              <Input
                id="edit-quantity"
                type="number"
                min="0"
                placeholder="0"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-expiration_date">Data de Validade (Opcional)</Label>
            <Input
              id="edit-expiration_date"
              type="date"
              value={formData.expiration_date}
              className="cursor-pointer"
              onChange={(e) =>
                setFormData({ ...formData, expiration_date: e.target.value })
              }
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              className="cursor-pointer"
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>

            <Button className="cursor-pointer" type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}