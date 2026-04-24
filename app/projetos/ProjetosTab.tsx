"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listarProjetos, criarProjeto, editarProjeto, excluirProjeto,
  listarLogsProjeto,
  SITUACOES_PROJETO,
  labelSituacaoProjeto, formatMoeda, formatData,
  type Projeto, type ProjetoLog, type SituacaoProjeto, type FiltrosProjetos,
} from "@/lib/projetos";
import { SERVICOS_COMERCIAL } from "@/lib/comercial";
import { Card, Alert } from "@/app/components/ui";
import { useUnsavedChanges } from "@/lib/unsaved-changes";

const SITUACAO_BADGE: Record<SituacaoProjeto, string> = {
  em_execucao:           "bg-folk/10 text-folk border-folk/20",
  entregue_ao_comercial: "bg-green-100 text-green-700 border-green-200",
};

const CAMPO_CONFIG: Record<string, { label: string; dot: string }> = {
  situacao:    { label: "Situação",    dot: "bg-folk" },
  valor:       { label: "Valor",       dot: "bg-green-500" },
  observacoes: { label: "Observações", dot: "bg-amber-400" },
};

function formatLogTs(s: string): string {
  const d = new Date(s);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " +
         d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function CheckboxServicos({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  function toggle(s: string) {
    onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {SERVICOS_COMERCIAL.map((s) => {
        const checked = value.includes(s);
        return (
          <button key={s} type="button" onClick={() => toggle(s)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${checked ? "border-folk bg-folk text-white" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-folk/40 hover:text-folk"}`}>
            {s}
          </button>
        );
      })}
    </div>
  );
}

interface FormState {
  data_inicio: string;
  cliente: string;
  servicos: string[];
  situacao: SituacaoProjeto;
  valor: string;
  observacoes: string;
}

const FORM_VAZIO: FormState = { data_inicio: "", cliente: "", servicos: [], situacao: "em_execucao", valor: "", observacoes: "" };

const INPUT = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10 w-full";
const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";

export default function ProjetosTab() {
  const [registros, setRegistros]   = useState<Projeto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState<string | null>(null);
  const [view, setView]             = useState<"list" | "form">("list");
  const [editando, setEditando]     = useState<Projeto | null>(null);
  const [visualizando, setVisualizando] = useState<Projeto | null>(null);
  const [form, setForm]             = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando]     = useState(false);
  const [erroForm, setErroForm]     = useState<string | null>(null);
  const [excluindo, setExcluindo]   = useState<string | null>(null);
  const [filtros, setFiltros]       = useState<FiltrosProjetos>({ situacao: "" });
  const [logs, setLogs]             = useState<ProjetoLog[]>([]);
  const [carregandoLogs, setCarregandoLogs] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try { setRegistros(await listarProjetos({ situacao: filtros.situacao || undefined })); }
    catch (e) { setErro(e instanceof Error ? e.message : "Erro ao carregar."); }
    finally { setCarregando(false); }
  }, [filtros]);

  useEffect(() => { carregar(); }, [carregar]);

  async function carregarLogs(id: string) {
    setCarregandoLogs(true);
    try { setLogs(await listarLogsProjeto(id)); }
    catch { setLogs([]); }
    finally { setCarregandoLogs(false); }
  }

  const { markDirty, markClean, guardCancel } = useUnsavedChanges();

  function abrirNovo() { setEditando(null); setForm(FORM_VAZIO); setErroForm(null); setLogs([]); markClean(); setView("form"); }
  function abrirEditar(r: Projeto) {
    setEditando(r);
    setForm({ data_inicio: r.data_inicio, cliente: r.cliente, servicos: r.servicos ?? [], situacao: r.situacao, valor: String(r.valor), observacoes: r.observacoes ?? "" });
    setErroForm(null); markClean(); setView("form"); carregarLogs(r.id);
  }
  function cancelar() { guardCancel(() => { setView("list"); setEditando(null); setErroForm(null); setLogs([]); }); }
  function set<K extends keyof FormState>(k: K, v: FormState[K]) { setForm((p) => ({ ...p, [k]: v })); markDirty(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.data_inicio || !form.cliente) { setErroForm("Preencha todos os campos obrigatórios."); return; }
    setSalvando(true); setErroForm(null);
    try {
      const payload = { data_inicio: form.data_inicio, cliente: form.cliente.trim(), servicos: form.servicos, situacao: form.situacao, valor: parseFloat(form.valor.replace(",", ".")) || 0, observacoes: form.observacoes.trim() };
      const idEditado = editando?.id ?? null;
      if (editando) await editarProjeto(editando.id, payload, editando);
      else           await criarProjeto(payload);
      markClean();
      await carregar();
      if (idEditado) {
        setEditando((prev) => prev ? { ...prev, ...payload } : null);
        setTimeout(() => carregarLogs(idEditado), 400);
      } else {
        setView("list"); setLogs([]);
      }
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally { setSalvando(false); }
  }

  async function handleExcluir(id: string) {
    setExcluindo(id);
    try { await excluirProjeto(id); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : "Erro ao excluir."); }
    finally { setExcluindo(null); }
  }

  if (view === "form") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button onClick={cancelar} className="text-sm text-gray-400 hover:text-gray-600">← Voltar</button>
          <h2 className="text-lg font-bold text-gray-900">{editando ? `Editando — ${editando.cliente}` : "Novo projeto"}</h2>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Data de início *</label>
              <input type="date" value={form.data_inicio} onChange={(e) => set("data_inicio", e.target.value)} required className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Situação</label>
              <select value={form.situacao} onChange={(e) => set("situacao", e.target.value as SituacaoProjeto)} className={INPUT}>
                {SITUACOES_PROJETO.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Cliente *</label>
              <input type="text" value={form.cliente} onChange={(e) => set("cliente", e.target.value)} required placeholder="Nome do cliente" className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Valor aproximado (R$)</label>
              <input type="number" min="0" step="0.01" value={form.valor} onChange={(e) => set("valor", e.target.value)} placeholder="0,00" className={INPUT} />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className={LABEL}>Serviços</label>
              <CheckboxServicos value={form.servicos} onChange={(v) => set("servicos", v)} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <textarea rows={3} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} placeholder="Anotações internas sobre o projeto..." className={`${INPUT} resize-none`} />
            </div>
            {erroForm && <div className="sm:col-span-2"><Alert status="error" message={erroForm} /></div>}
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={salvando} className="rounded-2xl bg-folk-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60">
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar projeto"}
              </button>
              <button type="button" onClick={cancelar} className="rounded-2xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300">Cancelar</button>
            </div>
          </form>
        </Card>

        {editando && (
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-800">Histórico de alterações</h3>
            {carregandoLogs && <p className="text-sm text-gray-400">Carregando...</p>}
            {!carregandoLogs && logs.length === 0 && <p className="text-sm text-gray-400">Nenhuma alteração registrada ainda.</p>}
            {!carregandoLogs && logs.length > 0 && (
              <div>
                {logs.map((log, i) => {
                  const cfg = CAMPO_CONFIG[log.campo] ?? { label: log.campo, dot: "bg-gray-300" };
                  return (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                        {i < logs.length - 1 && <div className="w-px flex-1 bg-gray-100 my-1" />}
                      </div>
                      <div className={`${i < logs.length - 1 ? "pb-4" : ""} min-w-0`}>
                        <p className="text-[11px] text-gray-400 mb-0.5">{formatLogTs(log.created_at)}</p>
                        <p className="text-xs font-semibold text-gray-500">{cfg.label}</p>
                        <p className="text-sm text-gray-700">{log.valor_anterior} → {log.valor_novo}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  return (
    <div>
      {visualizando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setVisualizando(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Detalhes do projeto</h3>
              <button onClick={() => setVisualizando(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">✕</button>
            </div>
            <dl className="flex flex-col gap-3">
              <div><dt className={LABEL}>Cliente</dt><dd className="mt-0.5 text-sm text-gray-800">{visualizando.cliente}</dd></div>
              <div><dt className={LABEL}>Início</dt><dd className="mt-0.5 text-sm text-gray-800">{formatData(visualizando.data_inicio)}</dd></div>
              <div><dt className={LABEL}>Situação</dt><dd className="mt-0.5"><span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${SITUACAO_BADGE[visualizando.situacao]}`}>{labelSituacaoProjeto(visualizando.situacao)}</span></dd></div>
              <div><dt className={LABEL}>Valor</dt><dd className="mt-0.5 text-sm text-gray-800">{formatMoeda(visualizando.valor)}</dd></div>
              {visualizando.servicos?.length > 0 && (
                <div><dt className={LABEL}>Serviços</dt><dd className="mt-1 flex flex-wrap gap-1">{visualizando.servicos.map((s) => <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{s}</span>)}</dd></div>
              )}
              {visualizando.observacoes && (
                <div><dt className={LABEL}>Observações</dt><dd className="mt-0.5 text-sm text-gray-700 whitespace-pre-wrap">{visualizando.observacoes}</dd></div>
              )}
            </dl>
          </div>
        </div>
      )}

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-1.5 sm:w-1/2">
          <label className={LABEL}>Situação</label>
          <select value={filtros.situacao} onChange={(e) => setFiltros({ situacao: e.target.value as SituacaoProjeto | "" })} className={INPUT}>
            <option value="">Todas</option>
            {SITUACOES_PROJETO.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">{carregando ? "Carregando..." : `${registros.length} projeto${registros.length !== 1 ? "s" : ""}`}</p>
        <button onClick={abrirNovo} className="rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]">+ Novo projeto</button>
      </div>

      {erro && <Alert status="error" message={erro} />}

      {!carregando && registros.length === 0 && !erro && (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">Nenhum projeto encontrado.</div>
      )}

      {registros.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="py-3 pl-6 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Início</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Cliente</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Serviços</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Situação</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Valor</th>
                <th className="py-3 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 pl-6 pr-4 text-sm text-gray-500">{formatData(r.data_inicio)}</td>
                  <td className="py-3 pr-4 text-sm font-medium text-gray-900">{r.cliente}</td>
                  <td className="py-3 pr-4">
                    {r.servicos?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {r.servicos.map((s) => <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{s}</span>)}
                      </div>
                    ) : <span className="text-sm text-gray-400">—</span>}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${SITUACAO_BADGE[r.situacao]}`}>
                      {labelSituacaoProjeto(r.situacao)}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-sm text-gray-700">{formatMoeda(r.valor)}</td>
                  <td className="py-3 pr-6">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <button onClick={() => setVisualizando(r)} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700">Ver</button>
                      <button onClick={() => abrirEditar(r)} className="rounded-lg border border-folk/20 px-2.5 py-1 text-xs font-semibold text-folk transition-colors hover:border-folk/50 hover:bg-folk/5">Editar</button>
                      <button onClick={() => handleExcluir(r.id)} disabled={excluindo === r.id} className="rounded-lg border border-red-100 px-2.5 py-1 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50">
                        {excluindo === r.id ? "..." : "Excluir"}
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
