import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

export async function uploadImageFromUrl(url: string, filename: string) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();

  const { error } = await supabaseAdmin.storage
    .from("products")
    .upload(filename, buffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) throw new Error("Erro ao enviar imagem: " + error.message);

  const { data: publicData } = supabaseAdmin.storage
    .from("products")
    .getPublicUrl(filename);

  return publicData.publicUrl;
}
