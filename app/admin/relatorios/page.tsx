import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import RelatoriosPanel from "./RelatoriosPanel";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">
          ← Admin
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="mt-0.5 text-sm text-gray-500">Geração e exportação de relatórios gerenciais</p>
        </div>
      </div>
      <RelatoriosPanel />
    </main>
  );
}
