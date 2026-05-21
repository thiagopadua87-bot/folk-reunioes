"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listarMotivosPerda, criarMotivoPerda, editarMotivoPerda,
  type MotivoPerda, type MotivoPerdaPayload, type FiltrosMotivosPerda,
} from "@/lib/cadastros";
import { Card, Alert } from "@/app/components/ui";
import { useUnsavedChanges } from "@/lib/unsaved-changes";

const INPUT =
  "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10 w-full";
const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";

interface FormState {
  nome: string;
  status: "ativo" | "inativo";
}

const FORM_VAZIO: FormState = { nome: "", status: "ativo" };

export default function MotivosDePerda() {
  const [registros, setRegistros]   = useState<MotivoPerda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState<string | null>(null);
  const [view, setView]             = useState<"list" | "form">("list");
  const [editando, setEditando]     = useState<MotivoPerda | null>(null);
  const [form, setForm]             = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando]     = useState(false);
  const [erroForm, setErroForm]     = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [filtros, setFiltros]       = useState<FiltrosMotivosPerda>({ busca: "", status: "" });

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      setRegistros(
        await listarMotivosPerda({
          busca:  filtros.busca  || undefined,
          status: filtros.status || undefined,
        }),
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally { setCarregando(false); }
  }, [filtros]);

  useEffect(() => { carregar(); }, [carregar]);

  const { markDirty, markClean, guardCancel } = useUnsavedChanges();

  function abrirNovo() {
    setEditando(null); setForm(FORM_VAZIO); setErroForm(null); markClean(); setView("form");
  }
  function abrirEditar(r: MotivoPerda) {
    setEditando(r);
    setForm({ nome: r.nome, status: r.status });
    setErroForm(null); markClean(); setView("form");
  }
  function cancelar() { guardCancel(() => { setView("list"); setEditando(null); setErroForm(null); }); }
  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v })); markDirty();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { setErroForm("O nome do motivo é obrigatório."); return; }
    setSalvando(true); setErroForm(null);
    try {
      const payload: MotivoPerdaPayload = { nome: form.nome.trim(), status: form.status };
      if (editando) await editarMotivoPerda(editando.id, payload);
      else          await criarMotivoPerda(payload);
      markClean(); setView("list"); setEditando(null); await carregar();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar.";
      if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("duplicate")) {
        setErroForm("Já existe um motivo de perda com este nome.");
      } else {
        setErroForm(msg);
      }
    } finally { setSalvando(false); }
  }

  async function inativar(r: MotivoPerda) {
    setConfirmando(null);
    try {
      await editarMotivoPerda(r.id, { nome: r.nome, status: "inativo" });
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao inativar.");
    }
  }

  async function ativar(r: MotivoPerda) {
    try {
      await editarMotivoPerda(r.id, { nome: r.nome, status: "ativo" });
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao ativar.");
    }
  }

  // ── Formulário ──────────────────────────────────────────────

  if (view === "form") {
    return (
      <div>
        <div className="mb-6 flex items-center gap-3">
          <button onClick={cancelar} className="text-sm text-gray-400 hover:text-gray-600">
            ← Voltar
          </button>
          <h2 className="text-lg font-bold text-gray-900">
            {editando ? "Editar motivo de perda" : "Novo motivo de perda"}
          </h2>
        </div>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Nome do motivo *</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => set("nome", e.target.value)}
                required
                placeholder="Ex: Preço, Qualidade do serviço..."
                className={INPUT}
              />
            </div>

            <div className="flex items-center gap-3 sm:col-span-2">
              <input
                type="checkbox"
                id="ativo-mp"
                checked={form.status === "ativo"}
                onChange={(e) => set("status", e.target.checked ? "ativo" : "inativo")}
                className="h-4 w-4 rounded border-gray-300 accent-folk"
              />
              <label htmlFor="ativo-mp" className="text-sm text-gray-700">Ativo</label>
            </div>

            {erroForm && (
              <div className="sm:col-span-2">
                <Alert status="error" message={erroForm} />
              </div>
            )}

            <div className="flex gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={salvando}
                className="rounded-2xl bg-folk-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar motivo"}
              </button>
              <button
                type="button"
                onClick={cancelar}
                className="rounded-2xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // ── Listagem ────────────────────────────────────────────────

  return (
    <div>
      {/* Modal de confirmação inativar */}
      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-bold text-gray-900">Inativar motivo de perda</h3>
            <p className="mb-5 text-sm text-gray-600">
              Deseja realmente inativar este motivo de perda?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmando(null)}
                className="rounded-2xl border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const r = registros.find((x) => x.id === confirmando);
                  if (r) inativar(r);
                }}
                className="rounded-2xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Inativar
              </button>
            </div>
          </div>
        </div>
      )}

      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Buscar</label>
            <input
              type="text"
              value={filtros.busca}
              onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))}
              placeholder="Nome do motivo..."
              className={INPUT}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Status</label>
            <select
              value={filtros.status ?? ""}
              onChange={(e) =>
                setFiltros((f) => ({
                  ...f,
                  status: e.target.value as "ativo" | "inativo" | "",
                }))
              }
              className={INPUT}
            >
              <option value="">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {carregando
            ? "Carregando..."
            : `${registros.length} motivo${registros.length !== 1 ? "s" : ""}`}
        </p>
        <button
          onClick={abrirNovo}
          className="rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]"
        >
          + Novo motivo
        </button>
      </div>

      {erro && <Alert status="error" message={erro} />}

      {!carregando && registros.length === 0 && !erro && (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
          Nenhum motivo de perda cadastrado.
        </div>
      )}

      {registros.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="py-3 pl-6 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Motivo
                </th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Data de cadastro
                </th>
                <th className="py-3 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-100 last:border-0 transition-colors hover:bg-gray-50/50"
                >
                  <td className="py-3.5 pl-6 pr-4 text-sm font-medium text-gray-900">
                    {r.nome}
                  </td>
                  <td className="py-3.5 pr-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        r.status === "ativo"
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-gray-200 bg-gray-100 text-gray-500"
                      }`}
                    >
                      {r.status === "ativo" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 text-sm text-gray-500">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-3.5 pr-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirEditar(r)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-folk/30 hover:text-folk"
                      >
                        Editar
                      </button>
                      {r.status === "ativo" ? (
                        <button
                          onClick={() => setConfirmando(r.id)}
                          className="rounded-lg border border-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-50"
                        >
                          Inativar
                        </button>
                      ) : (
                        <button
                          onClick={() => ativar(r)}
                          className="rounded-lg border border-green-100 px-3 py-1.5 text-xs font-semibold text-green-600 transition-colors hover:bg-green-50"
                        >
                          Ativar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
