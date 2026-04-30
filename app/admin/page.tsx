import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import type { Profile } from "@/lib/profiles";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, nome")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  let profiles: Profile[] | null = null;
  let erroAdmin: string | null = null;

  try {
    const admin = createAdminSupabase();
    const { data, error } = await admin
      .from("profiles")
      .select("id, nome, email, role, status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    profiles = data as Profile[];
  } catch (e) {
    erroAdmin = e instanceof Error ? e.message : "Erro desconhecido.";
  }

  if (erroAdmin) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-red-600">Erro ao carregar usuários: {erroAdmin}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Gestão de Usuários</h1>
          <p className="mt-1 text-sm text-gray-500">
            Olá, {profile?.nome}. Gerencie os pedidos de acesso ao sistema.
          </p>
        </div>
        <Link
          href="/admin/relatorios"
          className="rounded-2xl bg-folk-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 whitespace-nowrap"
        >
          Relatórios
        </Link>
      </div>

      <AdminPanel profiles={(profiles ?? []) as Profile[]} />
    </main>
  );
}
