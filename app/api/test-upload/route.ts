import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const productId = formData.get("productId") as string;

  if (!file || !productId) {
    return NextResponse.json(
      { error: "Arquivo ou productId não fornecido" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileExt = file.name.split(".").pop();
  const fileName = `product-${productId}-${Date.now()}.${fileExt}`;

  // 🔹 Upload no bucket
  const { error } = await supabaseAdmin.storage
    .from("products")
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 🔹 Gerar URL pública
  const { data } = supabaseAdmin.storage
    .from("products")
    .getPublicUrl(fileName);

  const publicUrl = data.publicUrl;

  // 🔹 Atualizar tabela products com a URL
  const { error: dbError } = await supabaseAdmin
    .from("products")
    .update({ image_url: publicUrl })
    .eq("id", productId);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ publicUrl });
}
