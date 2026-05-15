import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 1. Atualiza os cookies na requisição para o servidor não se perder
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          
          // 2. Cria a resposta base
          supabaseResponse = NextResponse.next({
            request,
          })

          // 3. Força a gravação dos cookies no navegador para manter o login no F5
          cookiesToSet.forEach(({ name, value, options }) => 
            supabaseResponse.cookies.set(name, value, {
              ...options,
              // Garante que os cookies de sessão não expirem prematuramente
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            })
          )
        },
      },
    },
  )

  // IMPORTANTE: getUser() valida o token com o servidor e renova se necessário
  // Isso é mais seguro que getSession() que apenas lê do storage local
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  // Se houve erro de autenticação (token expirado, inválido, etc), limpa os cookies
  if (error) {
    console.warn("[Middleware] Erro de autenticação:", error.message)
  }

  const publicPaths = ["/login", "/cadastrar"]
  const isPublicPath = publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  // Proteger rotas do dashboard
  if (
    (request.nextUrl.pathname.startsWith("/dashboard") ||
      request.nextUrl.pathname.startsWith("/produtos") ||
      request.nextUrl.pathname.startsWith("/vendas")) &&
    !user
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (isPublicPath && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
