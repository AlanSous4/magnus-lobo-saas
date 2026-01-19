"use client";

import { useState } from "react";

export default function TestUploadButton() {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function testarUpload() {
    setError(null);
    setUrl(null);

    try {
      const res = await fetch("/api/test-upload", { method: "POST" });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setUrl(data.publicUrl);
      }
    } catch (err: any) {
      setError("Erro ao chamar API: " + err.message);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={testarUpload}
        className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
      >
        Testar Upload
      </button>

      {url && (
        <p className="text-green-600">
          Arquivo enviado! URL pública:{" "}
          <a href={url} target="_blank" rel="noopener noreferrer">
            {url}
          </a>
        </p>
      )}

      {error && <p className="text-red-600">Erro: {error}</p>}
    </div>
  );
}
