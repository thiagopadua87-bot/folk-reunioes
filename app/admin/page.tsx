import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import type { ProfileExtended, PerfilSistema } from "@/lib/profiles";
import AdminUsers from "./AdminUsers";
import PipelineLixeiraAdmin from "./PipelineLixeiraAdmin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: selfProfile } = await supabase
    .from("profiles")
    .select("role, nome")
    .eq("id", user.id)
    .single();

  if (selfProfile?.role !== "admin") redirect("/");

  const admin = createAdminSupabase();

  // Perfis do sistema (para dropdown e filtro)
  const { data: perfisSistema } = await admin
    .from("profiles_system")
    .select("id, nome, descricao, cor, ordem")
    .order("ordem");

  // Usuários com join no perfil organizacional
  const { data: profilesData, error: errProfiles } = await admin
    .from("profiles")
    .select(`
      id, nome, email, role, status, created_at,
      perfil_id, ativo, data_inativacao, motivo_inativacao,
      perfil:perfil_id (id, nome, descricao, cor, ordem)
    `)
    .order("created_at", { ascending: false });

  if (errProfiles) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-red-600">Erro ao carregar usuários: {errProfiles.message}</p>
      </main>
    );
  }

  // Último acesso via auth.users
  let authMap = new Map<string, string | null>();
  try {
    const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    authMap = new Map(authData.users.map((u) => [u.id, u.last_sign_in_at ?? null]));
  } catch {
    // não crítico
  }

  const users: ProfileExtended[] = (profilesData ?? []).map((p) => ({
    id:                p.id,
    nome:              p.nome,
    email:             p.email,
    role:              p.role,
    status:            p.status,
    created_at:        p.created_at,
    perfil_id:         p.perfil_id ?? null,
    perfil:            (p.perfil as unknown as PerfilSistema | null) ?? null,
    ativo:             p.ativo ?? true,
    data_inativacao:   p.data_inativacao ?? null,
    motivo_inativacao: p.motivo_inativacao ?? null,
    ultimo_acesso:     authMap.get(p.id) ?? null,
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administração</h1>
          <p className="mt-1 text-sm text-gray-500">Gerencie usuários, perfis e acessos ao sistema</p>
        </div>
        <Link
          href="/admin/relatorios"
          className="rounded-2xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-600 shadow-sm transition-all hover:bg-gray-50 whitespace-nowrap"
        >
          Relatórios
        </Link>
      </div>

      <AdminUsers users={users} perfisSistema={(perfisSistema ?? []) as PerfilSistema[]} />

      <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <PipelineLixeiraAdmin />
      </div>
    </main>
  );
}
