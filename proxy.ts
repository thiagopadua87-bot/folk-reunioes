import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROTAS_AUTH   = ["/login", "/signup"];
const ROTAS_STATUS = ["/pendente", "/recusado"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Detecta cookie de sessão do Supabase (formato: sb-<ref>-auth-token)
  const hasSession = request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );

  // Usuário não autenticado
  if (!hasSession) {
    if (ROTAS_AUTH.includes(pathname) || ROTAS_STATUS.includes(pathname)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Usuário autenticado tentando acessar login/signup → Home
  if (ROTAS_AUTH.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
