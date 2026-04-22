import { createServerSupabase } from "@/lib/supabase-server";
import LogoFolk from "@/app/components/LogoFolk";
import LogoutButton from "@/app/components/LogoutButton";

export default async function PendentePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  let nome = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome")
      .eq("id", user.id)
      .single();
    nome = profile?.nome ?? "";
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[--background] px-4">
      <div className="mb-8">
        <LogoFolk />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-yellow-200 bg-yellow-50 p-8 text-center shadow-sm">
        <div className="mb-4 text-5xl">⏳</div>
        <h1 className="mb-3 text-xl font-bold text-yellow-800">Aguardando aprovação</h1>
        <p className="text-sm text-yellow-700 leading-relaxed">
          {nome ? `Olá, ${nome}! ` : ""}
          Sua conta foi criada e está em análise. Um administrador irá liberar o seu acesso em breve.
        </p>

        <div className="mt-8">
          <LogoutButton className="rounded-lg border border-yellow-300 px-4 py-2 text-sm font-medium text-yellow-700 transition-colors hover:bg-yellow-100" />
        </div>
      </div>
    </div>
  );
}
