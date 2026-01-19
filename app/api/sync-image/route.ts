import { uploadImageFromUrl } from "@/lib/uploadImage";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { url, filename, productId } = await req.json();

  try {
    const publicUrl = await uploadImageFromUrl(url, filename);

    const { error } = await supabaseAdmin
      .from("products")
      .update({ imageUrl: publicUrl })
      .eq("id", productId);

    if (error) throw error;

    return NextResponse.json({ publicUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
