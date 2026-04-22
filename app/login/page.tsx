"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Alert, Card } from "@/app/components/ui";
import LogoFolk from "@/app/components/LogoFolk";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error || !data.user) {
      setErro("Email ou senha incorretos.");
      setLoading(false);
      return;
    }

    // Verificar status do perfil e redirecionar de acordo
    const { data: profile } = await supabase
      .from("profiles")
      .select("status, role")
      .eq("id", data.user.id)
      .single();

    const status = profile?.status ?? "pendente";

    if (status === "pendente") {
      router.push("/pendente");
    } else if (status === "recusado") {
      router.push("/recusado");
    } else {
      router.push("/");
    }

    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[--background] px-4">
      <div className="mb-8">
        <LogoFolk />
      </div>

      <Card className="w-full max-w-sm p-8">
        <h1 className="mb-6 text-xl font-bold text-gray-900">Entrar</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              placeholder="••••••••"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10"
            />
          </div>

          {erro && <Alert status="error" message={erro} />}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-2xl bg-folk-gradient py-3 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          Não tem conta?{" "}
          <Link href="/signup" className="font-semibold text-folk hover:underline">
            Criar conta
          </Link>
        </p>
      </Card>
    </div>
  );
}
