import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin"; // ✅ usa a instância já criada

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const productId = formData.get("productId") as string;

    if (!file || !productId) {
      return NextResponse.json(
        { error: "Arquivo ou productId ausente" },
        { status: 400 }
      );
    }

    // 🔹 Nome único para o arquivo
    const filePath = `${productId}/${Date.now()}-${file.name}`;

    // 🔹 Upload para bucket "products"
    const { error: uploadError } = await supabaseAdmin.storage
      .from("products")
      .upload(filePath, file, {
        cacheControl: "3600", // cache de 1h
        upsert: true,         // sobrescreve se já existir
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 🔹 Gerar URL pública
    const { data: publicData } = supabaseAdmin.storage
      .from("products")
      .getPublicUrl(filePath);

    if (!publicData?.publicUrl) {
      return NextResponse.json({ error: "Falha ao gerar URL pública" }, { status: 500 });
    }

    // 🔹 Adiciona parâmetros para padronizar tamanho (800x320, sem cortes)
    const publicUrl = `${publicData.publicUrl}?width=800&height=320&resize=contain`;

    // 🔹 Atualizar tabela products com a URL
    const { error: dbError } = await supabaseAdmin
      .from("products")
      .update({ image_url: publicUrl })
      .eq("id", productId);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ publicUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
