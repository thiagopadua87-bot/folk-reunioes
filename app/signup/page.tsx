"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Alert, Card } from "@/app/components/ui";
import LogoFolk from "@/app/components/LogoFolk";
import { notificarCadastroCriado } from "./actions";

export default function SignupPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });

    if (error) {
      setErro(error.message === "User already registered"
        ? "Este e-mail já está cadastrado."
        : error.message);
      setLoading(false);
      return;
    }

    notificarCadastroCriado(nome, email).catch(() => {});
    setSucesso(true);
    setLoading(false);
  }

  if (sucesso) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[--background] px-4">
        <div className="mb-8">
          <LogoFolk />
        </div>
        <Card className="w-full max-w-sm p-8 text-center">
          <div className="mb-4 text-4xl">✅</div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">Conta criada!</h1>
          <p className="text-sm text-gray-500">
            Seu cadastro foi recebido e está em análise. Um administrador irá aprovar o seu acesso em breve.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-semibold text-folk hover:underline"
          >
            Ir para o login
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[--background] px-4">
      <div className="mb-8">
        <LogoFolk />
      </div>

      <Card className="w-full max-w-sm p-8">
        <h1 className="mb-6 text-xl font-bold text-gray-900">Criar conta</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Nome completo
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              placeholder="Seu nome"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10"
            />
          </div>

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
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10"
            />
          </div>

          {erro && <Alert status="error" message={erro} />}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-2xl bg-folk-gradient py-3 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-folk hover:underline">
            Entrar
          </Link>
        </p>
      </Card>
    </div>
  );
}
