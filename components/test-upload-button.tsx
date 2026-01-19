"use client";

import { useState } from "react";

interface TestUploadButtonProps {
  productId: string; // 🔹 receber o productId como prop
  onUploadSuccess?: (url: string) => void; // 🔹 callback para atualizar lista
}

export default function TestUploadButton({ productId, onUploadSuccess }: TestUploadButtonProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUrl(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("productId", productId);

    try {
      const res = await fetch("/api/test-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setUrl(data.publicUrl);

        // 🔹 dispara callback para atualizar lista no ProductList
        if (onUploadSuccess) {
          onUploadSuccess(data.publicUrl);
        }
      }
    } catch (err: any) {
      setError("Erro ao chamar API: " + err.message);
    }
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor={`file-upload-${productId}`}
        className="cursor-pointer bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 inline-block"
      >
        Carregar Foto
      </label>
      <input
        id={`file-upload-${productId}`}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {url && (
        <p className="text-green-600 text-sm">
          Imagem enviada!{" "}
          <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
            ver imagem
          </a>
        </p>
      )}

      {error && <p className="text-red-600 text-sm">Erro: {error}</p>}
    </div>
  );
}
