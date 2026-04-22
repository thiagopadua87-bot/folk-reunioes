import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import ReuniaoCard from "@/app/components/ReuniaoCard";
import type { Reuniao } from "@/lib/reunioes";

export const dynamic = "force-dynamic";

export default async function HistoricoPage() {
  const supabase = await createServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let reunioes: Reuniao[] = [];
  let erro: string | null = null;

  const { data, error } = await supabase
    .from("reunioes")
    .select("id, data, responsavel, participantes, resumo, user_id")
    .eq("user_id", user.id)
    .order("data", { ascending: false });

  if (error) erro = error.message;
  else reunioes = data ?? [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Histórico</h1>
        <p className="mt-1 text-sm text-gray-500">Reuniões semanais registradas</p>
      </div>

      {erro && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {erro}
        </div>
      )}

      {!erro && reunioes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
          Nenhuma reunião registrada ainda.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {reunioes.map((reuniao) => (
          <ReuniaoCard key={reuniao.id} reuniao={reuniao} />
        ))}
      </div>
    </main>
  );
}
