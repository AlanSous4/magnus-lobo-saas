import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin"; 
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const fileContent = Buffer.from("teste de upload com service role key");

    const { error } = await supabaseAdmin.storage
      .from("products")
      .upload("teste.txt", fileContent, {
        contentType: "text/plain",
        upsert: true,
      });

    if (error) throw error;

    const { data } = supabaseAdmin.storage
      .from("products")
      .getPublicUrl("teste.txt");

    return NextResponse.json({ publicUrl: data.publicUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
