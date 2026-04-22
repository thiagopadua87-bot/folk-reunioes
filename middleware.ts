import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROTAS_AUTH   = ["/login", "/signup"];
const ROTAS_STATUS = ["/pendente", "/recusado"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Usuário não autenticado
  if (!user) {
    if (ROTAS_AUTH.includes(pathname) || ROTAS_STATUS.includes(pathname)) {
      return response;
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Usuário autenticado — verificar status do perfil
  const { data: profile } = await supabase
    .from("profiles")
    .select("status, role")
    .eq("id", user.id)
    .single();

  const status = profile?.status ?? "pendente";
  const role   = profile?.role   ?? "user";

  // Redirecionar usuários autenticados para fora das páginas de auth
  if (ROTAS_AUTH.includes(pathname)) {
    if (status === "pendente") return NextResponse.redirect(new URL("/pendente", request.url));
    if (status === "recusado") return NextResponse.redirect(new URL("/recusado", request.url));
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Página /pendente — só para usuários pendentes
  if (pathname === "/pendente") {
    if (status === "aprovado") return NextResponse.redirect(new URL("/", request.url));
    if (status === "recusado") return NextResponse.redirect(new URL("/recusado", request.url));
    return response;
  }

  // Página /recusado — só para usuários recusados
  if (pathname === "/recusado") {
    if (status === "aprovado") return NextResponse.redirect(new URL("/", request.url));
    if (status === "pendente") return NextResponse.redirect(new URL("/pendente", request.url));
    return response;
  }

  // Bloquear usuários não aprovados de todas as demais rotas
  if (status === "pendente") return NextResponse.redirect(new URL("/pendente", request.url));
  if (status === "recusado") return NextResponse.redirect(new URL("/recusado", request.url));

  // Rota /operacional — requer aprovação (já garantida acima)
  // Rota /admin — exclusiva para admins
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
