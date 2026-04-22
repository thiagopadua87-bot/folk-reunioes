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

  const admin = createAdminSupabase();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, nome, email, role, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-red-600">Erro ao carregar usuários: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Gestão de Usuários</h1>
        <p className="mt-1 text-sm text-gray-500">
          Olá, {profile?.nome}. Gerencie os pedidos de acesso ao sistema.
        </p>
      </div>

      <AdminPanel profiles={(profiles ?? []) as Profile[]} />
    </main>
  );
}
