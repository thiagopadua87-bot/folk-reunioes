"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listarTecnicos, criarTecnico, editarTecnico,
  type Tecnico, type TecnicoPayload, type FiltrosTecnicos,
} from "@/lib/cadastros";
import { Card, Alert } from "@/app/components/ui";
import { useUnsavedChanges } from "@/lib/unsaved-changes";

const INPUT = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10 w-full";
const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";

interface FormState {
  nome: string;
  telefone: string;
  email: string;
  ativo: boolean;
}

const FORM_VAZIO: FormState = { nome: "", telefone: "", email: "", ativo: true };

export default function TecnicosTab() {
  const [registros, setRegistros] = useState<Tecnico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "form">("list");
  const [editando, setEditando] = useState<Tecnico | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosTecnicos>({ busca: "", ativo: null });

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      setRegistros(await listarTecnicos({ busca: filtros.busca || undefined, ativo: filtros.ativo ?? undefined }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally { setCarregando(false); }
  }, [filtros]);

  useEffect(() => { carregar(); }, [carregar]);

  const { markDirty, markClean, guardCancel } = useUnsavedChanges();

  function abrirNovo() { setEditando(null); setForm(FORM_VAZIO); setErroForm(null); markClean(); setView("form"); }
  function abrirEditar(r: Tecnico) {
    setEditando(r);
    setForm({ nome: r.nome, telefone: r.telefone, email: r.email, ativo: r.ativo });
    setErroForm(null); markClean(); setView("form");
  }
  function cancelar() { guardCancel(() => { setView("list"); setEditando(null); setErroForm(null); }); }
  function set<K extends keyof FormState>(k: K, v: FormState[K]) { setForm((p) => ({ ...p, [k]: v })); markDirty(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { setErroForm("Nome é obrigatório."); return; }
    setSalvando(true); setErroForm(null);
    try {
      const payload: TecnicoPayload = { nome: form.nome.trim(), telefone: form.telefone.trim(), email: form.email.trim(), ativo: form.ativo };
      if (editando) await editarTecnico(editando.id, payload);
      else           await criarTecnico(payload);
      markClean(); setView("list"); setEditando(null); await carregar();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally { setSalvando(false); }
  }

  async function toggleAtivo(r: Tecnico) {
    try {
      await editarTecnico(r.id, { nome: r.nome, telefone: r.telefone, email: r.email, ativo: !r.ativo });
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao atualizar.");
    }
  }

  if (view === "form") {
    return (
      <div>
        <div className="mb-6 flex items-center gap-3">
          <button onClick={cancelar} className="text-sm text-gray-400 hover:text-gray-600">← Voltar</button>
          <h2 className="text-lg font-bold text-gray-900">{editando ? "Editar técnico" : "Novo técnico"}</h2>
        </div>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Nome *</label>
              <input type="text" value={form.nome} onChange={(e) => set("nome", e.target.value)} required placeholder="Nome do técnico" className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Telefone</label>
              <input type="tel" value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="(00) 00000-0000" className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>E-mail</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@exemplo.com" className={INPUT} />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <input type="checkbox" id="ativo-t" checked={form.ativo} onChange={(e) => set("ativo", e.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-folk" />
              <label htmlFor="ativo-t" className="text-sm text-gray-700">Ativo</label>
            </div>
            {erroForm && <div className="sm:col-span-2"><Alert status="error" message={erroForm} /></div>}
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={salvando} className="rounded-2xl bg-folk-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60">
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar técnico"}
              </button>
              <button type="button" onClick={cancelar} className="rounded-2xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300">Cancelar</button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Buscar</label>
            <input type="text" value={filtros.busca} onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))} placeholder="Nome do técnico..." className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Status</label>
            <select value={filtros.ativo == null ? "" : String(filtros.ativo)} onChange={(e) => setFiltros((f) => ({ ...f, ativo: e.target.value === "" ? null : e.target.value === "true" }))} className={INPUT}>
              <option value="">Todos</option>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">{carregando ? "Carregando..." : `${registros.length} técnico${registros.length !== 1 ? "s" : ""}`}</p>
        <button onClick={abrirNovo} className="rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]">
          + Novo técnico
        </button>
      </div>

      {erro && <Alert status="error" message={erro} />}

      {!carregando && registros.length === 0 && !erro && (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">Nenhum técnico cadastrado.</div>
      )}

      {registros.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="py-3 pl-6 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Nome</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Telefone</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">E-mail</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="py-3 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 pl-6 pr-4 text-sm font-medium text-gray-900">{r.nome}</td>
                  <td className="py-3.5 pr-4 text-sm text-gray-500">{r.telefone || "—"}</td>
                  <td className="py-3.5 pr-4 text-sm text-gray-500">{r.email || "—"}</td>
                  <td className="py-3.5 pr-4">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${r.ativo ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                      {r.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="py-3.5 pr-6">
                    <div className="flex items-center gap-2">
                      <button onClick={() => abrirEditar(r)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-folk/30 hover:text-folk">Editar</button>
                      <button onClick={() => toggleAtivo(r)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${r.ativo ? "border-amber-100 text-amber-600 hover:bg-amber-50" : "border-green-100 text-green-600 hover:bg-green-50"}`}>
                        {r.ativo ? "Inativar" : "Ativar"}
                      </button>
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
