"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listarCrises, criarCrise, editarCrise, excluirCrise,
  listarLogsCrise,
  TIPOS_SERVICO, NIVEIS_RISCO,
  labelTipoServico, labelNivelRisco,
  type CriseItem, type CriseLog, type TipoServico, type NivelRisco,
} from "@/lib/operacional";
import { Card, Alert } from "@/app/components/ui";
import { useUnsavedChanges } from "@/lib/unsaved-changes";

// ── Log helpers ─────────────────────────────────────────────

const CAMPO_CONFIG: Record<string, { label: string; dot: string }> = {
  cliente:      { label: "Cliente",        dot: "bg-gray-500" },
  tipo_servico: { label: "Tipo de serviço", dot: "bg-folk" },
  risco:        { label: "Nível de risco",  dot: "bg-amber-400" },
  acoes:        { label: "Ações",           dot: "bg-blue-400" },
};

function formatLogTs(s: string): string {
  const d = new Date(s);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " +
         d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ── Estilos de risco ─────────────────────────────────────────

const RISCO_BADGE: Record<NivelRisco, string> = {
  alto:  "bg-red-100 text-red-700 border-red-200",
  medio: "bg-yellow-100 text-yellow-700 border-yellow-200",
  baixo: "bg-green-100 text-green-700 border-green-200",
};

const RISCO_ROW: Record<NivelRisco, string> = {
  alto:  "border-l-4 border-l-red-400",
  medio: "border-l-4 border-l-yellow-400",
  baixo: "border-l-4 border-l-green-400",
};

// ── Tipos de formulário ──────────────────────────────────────

interface FormState {
  cliente: string;
  tipo_servico: TipoServico;
  risco: NivelRisco;
  acoes: string;
}

const FORM_VAZIO: FormState = {
  cliente: "",
  tipo_servico: "portaria_remota",
  risco: "medio",
  acoes: "",
};

const INPUT =
  "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10 w-full";
const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";

// ── Componente principal ─────────────────────────────────────

export default function GestaoCrise() {
  const [crises, setCrises] = useState<CriseItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "form">("list");
  const [editando, setEditando] = useState<CriseItem | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [filtroRisco, setFiltroRisco] = useState<NivelRisco | "">("");
  const [logs, setLogs]           = useState<CriseLog[]>([]);
  const [carregandoLogs, setCarregandoLogs] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const data = await listarCrises({ risco: filtroRisco || undefined });
      setCrises(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setCarregando(false);
    }
  }, [filtroRisco]);

  useEffect(() => { carregar(); }, [carregar]);

  const { markDirty, markClean, guardCancel } = useUnsavedChanges();

  async function carregarLogs(id: string) {
    setCarregandoLogs(true);
    try { setLogs(await listarLogsCrise(id)); }
    catch { setLogs([]); }
    finally { setCarregandoLogs(false); }
  }

  function abrirFormNovo() {
    setEditando(null); setForm(FORM_VAZIO); setErroForm(null); setLogs([]); markClean(); setView("form");
  }

  function abrirFormEditar(c: CriseItem) {
    setEditando(c);
    setForm({ cliente: c.cliente, tipo_servico: c.tipo_servico, risco: c.risco, acoes: c.acoes });
    setErroForm(null); markClean(); setView("form"); carregarLogs(c.id);
  }

  function cancelar() { guardCancel(() => { setView("list"); setEditando(null); setErroForm(null); setLogs([]); }); }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v })); markDirty();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cliente.trim()) {
      setErroForm("Informe o nome do cliente.");
      return;
    }
    setSalvando(true);
    setErroForm(null);
    try {
      const payload = { cliente: form.cliente.trim(), tipo_servico: form.tipo_servico, risco: form.risco, acoes: form.acoes.trim() };
      if (editando) await editarCrise(editando.id, payload, editando);
      else           await criarCrise(payload);
      markClean(); setView("list"); setEditando(null); await carregar();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(id: string) {
    setExcluindo(id);
    try {
      await excluirCrise(id);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao excluir.");
    } finally {
      setExcluindo(null);
    }
  }

  // ── Formulário ─────────────────────────────────────────────

  if (view === "form") {
    return (
      <div>
        <div className="mb-6 flex items-center gap-3">
          <button onClick={cancelar} className="text-sm text-gray-400 hover:text-gray-600">
            ← Voltar
          </button>
          <h2 className="text-lg font-bold text-gray-900">
            {editando ? "Editar crise" : "Nova crise"}
          </h2>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Cliente *</label>
              <input type="text" value={form.cliente} onChange={(e) => set("cliente", e.target.value)} required placeholder="Nome do cliente" className={INPUT} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Tipo de serviço</label>
              <select value={form.tipo_servico} onChange={(e) => set("tipo_servico", e.target.value as TipoServico)} className={INPUT}>
                {TIPOS_SERVICO.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Nível de risco</label>
              <select value={form.risco} onChange={(e) => set("risco", e.target.value as NivelRisco)} className={INPUT}>
                {NIVEIS_RISCO.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Ações tomadas / plano</label>
              <textarea value={form.acoes} onChange={(e) => set("acoes", e.target.value)} placeholder="Descreva as ações em andamento ou planejadas..." rows={4} className={`${INPUT} resize-none`} />
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
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar crise"}
              </button>
              <button type="button" onClick={cancelar} className="rounded-2xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300">
                Cancelar
              </button>
            </div>
          </form>
        </Card>

        {editando && (
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-800">Histórico de alterações</h3>
            {carregandoLogs && <p className="text-sm text-gray-400">Carregando...</p>}
            {!carregandoLogs && logs.length === 0 && (
              <p className="text-sm text-gray-400">Nenhuma alteração registrada ainda.</p>
            )}
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
                        <p className="text-[11px] text-gray-400 mb-0.5">
                          {formatLogTs(log.created_at)}
                          {log.autor_nome && <span className="ml-1">· {log.autor_nome}</span>}
                        </p>
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

  // ── Listagem ───────────────────────────────────────────────

  return (
    <div>
      {/* Filtro por risco */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {([["", "Todos"], ["alto", "Alto"], ["medio", "Médio"], ["baixo", "Baixo"]] as const).map(
          ([value, label]) => (
            <button
              key={value}
              onClick={() => setFiltroRisco(value as NivelRisco | "")}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                filtroRisco === value
                  ? "border-folk bg-folk text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-folk/40 hover:text-folk"
              }`}
            >
              {label}
            </button>
          )
        )}
      </div>

      {/* Cabeçalho + botão novo */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {carregando ? "Carregando..." : `${crises.length} registro${crises.length !== 1 ? "s" : ""}`}
        </p>
        <button onClick={abrirFormNovo} className="rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]">
          + Nova crise
        </button>
      </div>

      {erro && <Alert status="error" message={erro} />}

      {!carregando && crises.length === 0 && !erro && (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
          Nenhuma crise registrada.
        </div>
      )}

      {crises.length > 0 && (
        <div className="flex flex-col gap-3">
          {crises.map((c) => (
            <div key={c.id} className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${RISCO_ROW[c.risco]}`}>
              <div className="flex items-start justify-between gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{c.cliente}</p>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${RISCO_BADGE[c.risco]}`}>
                      {labelNivelRisco(c.risco)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{labelTipoServico(c.tipo_servico)}</p>
                  {c.acoes && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{c.acoes}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => abrirFormEditar(c)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-folk/30 hover:text-folk">
                    Editar
                  </button>
                  <button onClick={() => handleExcluir(c.id)} disabled={excluindo === c.id} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50">
                    {excluindo === c.id ? "..." : "Excluir"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
