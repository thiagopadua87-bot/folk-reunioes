"use client";

import { useState, useTransition } from "react";
import { atualizarStatusUsuario } from "./actions";
import type { Profile, UserStatus } from "@/lib/profiles";

const statusLabel: Record<UserStatus, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

const statusStyle: Record<UserStatus, string> = {
  pendente: "bg-yellow-100 text-yellow-700 border-yellow-200",
  aprovado: "bg-green-100 text-green-700 border-green-200",
  recusado: "bg-red-100 text-red-700 border-red-200",
};

function UserRow({ profile }: { profile: Profile }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleAction(status: UserStatus) {
    setErro(null);
    startTransition(async () => {
      try {
        await atualizarStatusUsuario(profile.id, status);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao atualizar.");
      }
    });
  }

  return (
    <tr className={`border-b border-gray-100 last:border-0 ${isPending ? "opacity-60" : ""}`}>
      <td className="py-3.5 pl-6 pr-4 text-sm font-medium text-gray-900">{profile.nome}</td>
      <td className="py-3.5 pr-4 text-sm text-gray-500">{profile.email}</td>
      <td className="py-3.5 pr-4">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyle[profile.status]}`}>
          {statusLabel[profile.status]}
        </span>
      </td>
      <td className="py-3.5 pr-4 text-xs text-gray-400">
        {new Date(profile.created_at).toLocaleDateString("pt-BR")}
      </td>
      <td className="py-3.5 pr-6">
        <div className="flex flex-wrap items-center gap-2">
          {profile.status !== "aprovado" && (
            <button
              onClick={() => handleAction("aprovado")}
              disabled={isPending}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              Aprovar
            </button>
          )}
          {profile.status !== "recusado" && (
            <button
              onClick={() => handleAction("recusado")}
              disabled={isPending}
              className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              Recusar
            </button>
          )}
          {profile.status !== "pendente" && (
            <button
              onClick={() => handleAction("pendente")}
              disabled={isPending}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-800 disabled:opacity-50"
            >
              Pendente
            </button>
          )}
        </div>
        {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
      </td>
    </tr>
  );
}

interface AdminPanelProps {
  profiles: Profile[];
}

export default function AdminPanel({ profiles }: AdminPanelProps) {
  const [filtro, setFiltro] = useState<UserStatus | "todos">("todos");

  const visíveis = filtro === "todos"
    ? profiles
    : profiles.filter((p) => p.status === filtro);

  const contagens = {
    todos:    profiles.length,
    pendente: profiles.filter((p) => p.status === "pendente").length,
    aprovado: profiles.filter((p) => p.status === "aprovado").length,
    recusado: profiles.filter((p) => p.status === "recusado").length,
  };

  const filtros: { value: UserStatus | "todos"; label: string }[] = [
    { value: "todos",    label: `Todos (${contagens.todos})` },
    { value: "pendente", label: `Pendentes (${contagens.pendente})` },
    { value: "aprovado", label: `Aprovados (${contagens.aprovado})` },
    { value: "recusado", label: `Recusados (${contagens.recusado})` },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {filtros.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFiltro(value)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
              filtro === value
                ? "border-folk bg-folk text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-folk/40 hover:text-folk"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {visíveis.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
          Nenhum usuário encontrado.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="py-3 pl-6 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Nome</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Email</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Cadastro</th>
                <th className="py-3 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visíveis.map((profile) => (
                <UserRow key={profile.id} profile={profile} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
