"use client";

import { useState, useTransition, useEffect } from "react";
import {
  atualizarStatusUsuario,
  atualizarPerfilUsuario,
  atualizarNomeUsuario,
  reativarUsuario,
  resetarSenha,
} from "./actions";
import PermissionsMatrix from "./PermissionsMatrix";
import InativarModal from "./InativarModal";
import type { ProfileExtended, PerfilSistema, StatusVisual } from "@/lib/profiles";
import { getStatusVisual, getInitials, formatUltimoAcesso } from "@/lib/profiles";
import type { UserStatus } from "@/lib/profiles";

// ── Helpers de estilo ─────────────────────────────────────────

const STATUS_STYLE: Record<StatusVisual, { bg: string; text: string; label: string }> = {
  ativo:    { bg: "bg-green-100",  text: "text-green-700",  label: "Ativo"    },
  pendente: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pendente" },
  recusado: { bg: "bg-red-100",    text: "text-red-700",    label: "Recusado" },
  inativo:  { bg: "bg-gray-100",   text: "text-gray-600",   label: "Inativo"  },
};

// ── Props ─────────────────────────────────────────────────────

interface Props {
  user:          ProfileExtended;
  perfisSistema: PerfilSistema[];
  onClose:       () => void;
}

// ── Componente ────────────────────────────────────────────────

export default function UserDrawer({ user, perfisSistema, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<"dados" | "permissoes">("dados");
  const [showInativar, setShowInativar] = useState(false);
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeEdit, setNomeEdit] = useState(user.nome);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [perfilEdit, setPerfilEdit] = useState(user.perfil_id ?? "");
  const [showResetSenha, setShowResetSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [isPending, startTransition] = useTransition();

  const sv = getStatusVisual(user);
  const statusStyle = STATUS_STYLE[sv];

  function feedback(msg: string, type: "ok" | "err") {
    if (type === "ok") { setSucesso(msg); setTimeout(() => setSucesso(""), 3000); }
    else setErro(msg);
  }

  function runAction(fn: () => Promise<void>) {
    setErro("");
    startTransition(async () => {
      try { await fn(); setSucesso(""); }
      catch (e) { feedback(e instanceof Error ? e.message : "Erro.", "err"); }
    });
  }

  function handleSalvarNome() {
    if (!nomeEdit.trim()) return;
    runAction(async () => {
      await atualizarNomeUsuario(user.id, nomeEdit);
      feedback("Nome atualizado.", "ok");
      setEditandoNome(false);
    });
  }

  function handleSalvarPerfil() {
    runAction(async () => {
      await atualizarPerfilUsuario(user.id, perfilEdit || null);
      feedback("Perfil atualizado.", "ok");
      setEditandoPerfil(false);
    });
  }

  function handleStatus(status: UserStatus) {
    runAction(async () => {
      await atualizarStatusUsuario(user.id, status);
      feedback(`Status alterado para ${status}.`, "ok");
    });
  }

  function handleReativar() {
    runAction(async () => {
      await reativarUsuario(user.id);
      feedback("Usuário reativado.", "ok");
    });
  }

  function handleResetSenha() {
    if (novaSenha.length < 6) { setErro("Mínimo 6 caracteres."); return; }
    runAction(async () => {
      await resetarSenha(user.id, novaSenha);
      feedback("Senha redefinida.", "ok");
      setShowResetSenha(false);
      setNovaSenha("");
    });
  }

  // Sync edits when user prop changes (after server revalidation)
  useEffect(() => {
    setNomeEdit(user.nome);
    setPerfilEdit(user.perfil_id ?? "");
  }, [user.nome, user.perfil_id]);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <span className="text-sm font-semibold text-gray-500">Detalhes do usuário</span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Avatar + info */}
        <div className="flex items-center gap-4 border-b border-gray-100 px-6 py-5">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-sm"
            style={{ backgroundColor: user.perfil?.cor ?? "#6B7280" }}
          >
            {getInitials(user.nome)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-gray-900">{user.nome}</p>
            <p className="truncate text-sm text-gray-500">{user.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                {statusStyle.label}
              </span>
              {user.perfil && (
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: user.perfil.cor }}
                >
                  {user.perfil.nome}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {(["dados", "permissoes"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`mr-6 border-b-2 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "border-folk text-folk"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "dados" ? "Dados" : "Permissões"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Aba Dados ── */}
          {activeTab === "dados" && (
            <div className="space-y-5">

              {/* Nome */}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Nome</p>
                {editandoNome ? (
                  <div className="flex gap-2">
                    <input
                      value={nomeEdit}
                      onChange={(e) => setNomeEdit(e.target.value)}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10"
                    />
                    <button onClick={handleSalvarNome} disabled={isPending}
                      className="rounded-xl bg-folk px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                      Salvar
                    </button>
                    <button onClick={() => { setEditandoNome(false); setNomeEdit(user.nome); }}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-500">
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-800">{user.nome}</p>
                    <button onClick={() => setEditandoNome(true)}
                      className="text-xs text-folk hover:underline">Editar</button>
                  </div>
                )}
              </div>

              {/* Perfil */}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Perfil organizacional</p>
                {editandoPerfil ? (
                  <div className="flex gap-2">
                    <select
                      value={perfilEdit}
                      onChange={(e) => setPerfilEdit(e.target.value)}
                      className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10"
                    >
                      <option value="">Sem perfil</option>
                      {perfisSistema.map((p) => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                    <button onClick={handleSalvarPerfil} disabled={isPending}
                      className="rounded-xl bg-folk px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                      Salvar
                    </button>
                    <button onClick={() => { setEditandoPerfil(false); setPerfilEdit(user.perfil_id ?? ""); }}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-500">
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    {user.perfil ? (
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: user.perfil.cor }}
                      >
                        {user.perfil.nome}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Sem perfil</span>
                    )}
                    <button onClick={() => setEditandoPerfil(true)}
                      className="text-xs text-folk hover:underline">Editar</button>
                  </div>
                )}
              </div>

              {/* Infos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Cadastro</p>
                  <p className="text-sm text-gray-700">
                    {new Date(user.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Último acesso</p>
                  <p className="text-sm text-gray-700">{formatUltimoAcesso(user.ultimo_acesso)}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Função</p>
                  <p className="text-sm text-gray-700 capitalize">
                    {user.role === "admin" ? "Administrador" : "Usuário"}
                  </p>
                </div>
                {!user.ativo && user.data_inativacao && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Inativado em</p>
                    <p className="text-sm text-gray-700">
                      {new Date(user.data_inativacao).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                )}
              </div>

              {!user.ativo && user.motivo_inativacao && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Motivo da inativação</p>
                  <p className="text-sm text-gray-700">{user.motivo_inativacao}</p>
                </div>
              )}

              {/* Separador Ações */}
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Ações</p>

                <div className="space-y-2">
                  {/* Status: Aprovar / Recusar */}
                  {user.ativo && user.status === "pendente" && (
                    <div className="flex gap-2">
                      <button onClick={() => handleStatus("aprovado")} disabled={isPending}
                        className="flex-1 rounded-xl bg-green-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50">
                        ✓ Aprovar
                      </button>
                      <button onClick={() => handleStatus("recusado")} disabled={isPending}
                        className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50">
                        ✕ Recusar
                      </button>
                    </div>
                  )}
                  {user.ativo && user.status === "aprovado" && (
                    <button onClick={() => handleStatus("recusado")} disabled={isPending}
                      className="w-full rounded-xl border border-red-200 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
                      ✕ Recusar acesso
                    </button>
                  )}
                  {user.ativo && user.status === "recusado" && (
                    <button onClick={() => handleStatus("aprovado")} disabled={isPending}
                      className="w-full rounded-xl border border-green-200 py-2 text-sm font-semibold text-green-600 transition-colors hover:bg-green-50 disabled:opacity-50">
                      ✓ Aprovar acesso
                    </button>
                  )}

                  {/* Redefinir senha */}
                  {user.ativo && !showResetSenha && (
                    <button onClick={() => setShowResetSenha(true)}
                      className="w-full rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50">
                      🔑 Redefinir senha
                    </button>
                  )}
                  {showResetSenha && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
                      <input
                        type="password"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        placeholder="Nova senha (mín. 6 caracteres)"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleResetSenha} disabled={isPending || novaSenha.length < 6}
                          className="flex-1 rounded-lg bg-folk py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                          {isPending ? "..." : "Salvar"}
                        </button>
                        <button onClick={() => { setShowResetSenha(false); setNovaSenha(""); }}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inativar / Reativar */}
                  {user.ativo ? (
                    <button
                      onClick={() => setShowInativar(true)}
                      className="w-full rounded-xl border border-red-100 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      ⛔ Inativar usuário
                    </button>
                  ) : (
                    <button
                      onClick={handleReativar}
                      disabled={isPending}
                      className="w-full rounded-xl border border-green-200 py-2 text-sm font-semibold text-green-600 transition-colors hover:bg-green-50 disabled:opacity-50"
                    >
                      {isPending ? "Reativando..." : "✓ Reativar usuário"}
                    </button>
                  )}
                </div>
              </div>

              {/* Feedback */}
              {erro    && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{erro}</p>}
              {sucesso && <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{sucesso}</p>}
            </div>
          )}

          {/* ── Aba Permissões ── */}
          {activeTab === "permissoes" && (
            user.role === "admin" ? (
              <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50">
                <div className="text-center">
                  <p className="text-2xl">🛡</p>
                  <p className="mt-2 text-sm font-semibold text-gray-500">Administrador</p>
                  <p className="mt-1 text-xs text-gray-400">Acesso total — não requer configuração</p>
                </div>
              </div>
            ) : (
              <PermissionsMatrix userId={user.id} userName={user.nome} onClose={() => {}} />
            )
          )}
        </div>
      </div>

      {/* Modal de inativação */}
      {showInativar && (
        <InativarModal
          user={user}
          onClose={() => setShowInativar(false)}
          onDone={() => { setShowInativar(false); onClose(); }}
        />
      )}
    </>
  );
}
