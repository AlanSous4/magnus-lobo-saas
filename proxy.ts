import { updateSession } from "@/lib/supabase/proxy"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 🔓 LIBERA preview para bots e usuários (NÃO passa pelo Supabase)
  if (pathname.startsWith("/preview")) {
    return NextResponse.next()
  }

  // 🔐 resto do site continua protegido normalmente
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
