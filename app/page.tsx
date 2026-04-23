import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { APP_VERSION } from "@/app/config/version"; // Verifique se o caminho @/ coincide com sua estrutura

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ✅ Se logado, vai para o dashboard
  if (user) {
    redirect("/dashboard");
  }

  // ✅ Se NÃO logado, redireciona para a tela de login real
  // Isso evita que o tablet fique preso na tela de texto
  redirect("/login");

  // O código abaixo serve como fallback de segurança
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">Padaria Magnus Lobo</h1>
        <p className="text-muted-foreground">Redirecionando...</p>
        <span className="text-xs text-muted-foreground block pt-4">
          Versão {APP_VERSION}
        </span>
      </div>
    </main>
  );
}