"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  listarPipeline, criarPipelineItem, editarPipelineItem, excluirPipelineItem,
  listarLogs,
  TEMPERATURAS, STATUS_PIPELINE, SERVICOS_COMERCIAL,
  labelTemperatura, labelStatusPipeline, formatMoeda, formatData,
  type PipelineItem, type PipelinePayload, type PipelineLog,
  type Temperatura, type StatusPipeline, type FiltrosPipeline,
} from "@/lib/comercial";
import { listarVendedores, type Vendedor } from "@/lib/cadastros";
import { Card, Alert } from "@/app/components/ui";
import { useUnsavedChanges } from "@/lib/unsaved-changes";

// ── Estilos visuais ──────────────────────────────────────────

const TEMP_BADGE: Record<Temperatura, string> = {
  fria:   "bg-blue-100 text-blue-700 border-blue-200",
  morna:  "bg-amber-100 text-amber-700 border-amber-200",
  quente: "bg-red-100 text-red-700 border-red-200",
};

const TEMP_BORDA: Record<Temperatura, string> = {
  fria:   "border-l-blue-400",
  morna:  "border-l-amber-400",
  quente: "border-l-red-400",
};

const STATUS_BADGE: Record<StatusPipeline, string> = {
  apresentacao:  "bg-gray-100 text-gray-600 border-gray-200",
  em_analise:    "bg-yellow-100 text-yellow-700 border-yellow-200",
  assinatura:    "bg-folk/10 text-folk border-folk/20",
  fechado:       "bg-green-100 text-green-700 border-green-200",
  declinado:     "bg-red-100 text-red-500 border-red-200",
  fechado_ganho: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

// ── Log helpers ──────────────────────────────────────────────

const CAMPO_CONFIG: Record<string, { label: string; dot: string }> = {
  status:               { label: "Status",                    dot: "bg-folk" },
  temperatura:          { label: "Temperatura",               dot: "bg-amber-400" },
  vendedor:             { label: "Vendedor",                  dot: "bg-blue-400" },
  valor_implantacao:    { label: "Valor de implantação",       dot: "bg-green-500" },
  valor_mensal:         { label: "Valor mensal",               dot: "bg-emerald-400" },
  data_lead:            { label: "Data do lead",              dot: "bg-blue-300" },
  cliente:              { label: "Cliente",                   dot: "bg-gray-500" },
  indicado_por:         { label: "Indicado por",              dot: "bg-amber-400" },
  observacoes:          { label: "Observações",               dot: "bg-amber-300" },
  servico_adicionado:   { label: "Serviço adicionado",        dot: "bg-folk" },
  servico_removido:     { label: "Serviço removido",          dot: "bg-red-400" },
  conversao:            { label: "Proposta convertida em venda", dot: "bg-emerald-500" },
  edicao_pos_conversao: { label: "Editado após conversão",    dot: "bg-amber-400" },
};

function formatLogMsg(log: PipelineLog): string {
  switch (log.campo) {
    case "status":               return `"${log.valor_anterior}" → "${log.valor_novo}"`;
    case "temperatura":          return `${log.valor_anterior} → ${log.valor_novo}`;
    case "vendedor":             return `${log.valor_anterior} → ${log.valor_novo}`;
    case "valor_implantacao":    return `${log.valor_anterior} → ${log.valor_novo}`;
    case "valor_mensal":         return `${log.valor_anterior} → ${log.valor_novo}`;
    case "servico_adicionado":   return log.valor_novo;
    case "servico_removido":     return log.valor_anterior;
    case "conversao":            return "Proposta convertida em venda";
    case "edicao_pos_conversao": return "⚠ Proposta editada após conversão";
    default:                     return `${log.valor_anterior} → ${log.valor_novo}`;
  }
}

function formatLogTs(s: string): string {
  const d = new Date(s);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " +
         d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ── Formulário ───────────────────────────────────────────────

function CheckboxServicos({ value, onChange, disabled }: { value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  function toggle(s: string) {
    if (disabled) return;
    onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);
  }
  return (
    <div className={`flex flex-wrap gap-2 ${disabled ? "opacity-60" : ""}`}>
      {SERVICOS_COMERCIAL.map((s) => {
        const checked = value.includes(s);
        return (
          <button key={s} type="button" onClick={() => toggle(s)} disabled={disabled}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              disabled
                ? `${checked ? "border-gray-300 bg-gray-200 text-gray-500" : "border-gray-200 bg-gray-100 text-gray-400"} cursor-not-allowed`
                : checked ? "border-folk bg-folk text-white" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-folk/40 hover:text-folk"
            }`}>
            {s}
          </button>
        );
      })}
    </div>
  );
}

interface FormState {
  data_inicio_lead: string;
  vendedor_id: string;
  cliente: string;
  temperatura: Temperatura;
  valor_implantacao: string;
  valor_mensal: string;
  status: StatusPipeline;
  servicos: string[];
  indicado_por: string;
  observacoes: string;
}

const FORM_VAZIO: FormState = {
  data_inicio_lead: "", vendedor_id: "", cliente: "",
  temperatura: "morna", valor_implantacao: "", valor_mensal: "", status: "apresentacao",
  servicos: [], indicado_por: "", observacoes: "",
};

const INPUT = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10 w-full";
const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";

// ── Componente principal ─────────────────────────────────────

interface PipelineTabProps {
  onConverter: (item: PipelineItem) => void;
  onIrParaVendas: () => void;
}

export default function PipelineTab({ onConverter, onIrParaVendas }: PipelineTabProps) {
  const [registros, setRegistros]   = useState<PipelineItem[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState<string | null>(null);
  const [view, setView]             = useState<"list" | "form">("list");
  const [editando, setEditando]     = useState<PipelineItem | null>(null);
  const [form, setForm]             = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando]     = useState(false);
  const [erroForm, setErroForm]     = useState<string | null>(null);
  const [excluindo, setExcluindo]   = useState<string | null>(null);
  const [convertendo, setConvertendo] = useState<string | null>(null);
  const [filtros, setFiltros]       = useState<FiltrosPipeline>({ temperatura: "", status: "" });
  const [logs, setLogs]             = useState<PipelineLog[]>([]);
  const [carregandoLogs, setCarregandoLogs] = useState(false);

  const logsVisiveis = useMemo(() => {
    const conversaoLog = logs.find((l) => l.campo === "conversao");
    if (!conversaoLog) return logs;
    const tConversao = new Date(conversaoLog.created_at).getTime();
    return logs.filter((l) => {
      if (l.campo !== "status") return true;
      return Math.abs(new Date(l.created_at).getTime() - tConversao) > 60_000;
    });
  }, [logs]);

  const reqIdRef = useRef(0);

  const carregar = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setCarregando(true); setErro(null);
    try {
      const [lista, vends] = await Promise.all([
        listarPipeline({ temperatura: filtros.temperatura || undefined, status: filtros.status || undefined }),
        listarVendedores({ ativo: true }),
      ]);
      if (reqId !== reqIdRef.current) return;
      setRegistros(lista);
      setVendedores(vends);
    } catch (e) {
      if (reqId !== reqIdRef.current) return;
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      if (reqId === reqIdRef.current) setCarregando(false);
    }
  }, [filtros]);

  useEffect(() => { carregar(); }, [carregar]);

  async function carregarLogs(id: string) {
    setCarregandoLogs(true);
    try { setLogs(await listarLogs(id)); }
    catch { setLogs([]); }
    finally { setCarregandoLogs(false); }
  }

  const { markDirty, markClean, guardCancel } = useUnsavedChanges();

  function abrirNovo() {
    setEditando(null); setForm(FORM_VAZIO); setErroForm(null); setLogs([]); markClean(); setView("form");
  }
  function abrirEditar(r: PipelineItem) {
    setEditando(r);
    setForm({ data_inicio_lead: r.data_inicio_lead, vendedor_id: r.vendedor_id ?? "", cliente: r.cliente, temperatura: r.temperatura, valor_implantacao: String(r.valor_implantacao), valor_mensal: String(r.valor_mensal), status: r.status, servicos: r.servicos ?? [], indicado_por: r.indicado_por, observacoes: r.observacoes });
    setErroForm(null); markClean(); setView("form"); carregarLogs(r.id);
  }
  function cancelar() { guardCancel(() => { setView("list"); setEditando(null); setErroForm(null); setLogs([]); }); }
  function set<K extends keyof FormState>(k: K, v: FormState[K]) { setForm((p) => ({ ...p, [k]: v })); markDirty(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.data_inicio_lead || !form.cliente) { setErroForm("Preencha todos os campos obrigatórios."); return; }
    setSalvando(true); setErroForm(null);
    try {
      const payload: PipelinePayload = {
        data_inicio_lead:  form.data_inicio_lead,
        vendedor_id:       form.vendedor_id || null,
        cliente:           form.cliente.trim(),
        temperatura:       form.temperatura,
        valor_implantacao: parseFloat(form.valor_implantacao.replace(",", ".")) || 0,
        valor_mensal:      parseFloat(form.valor_mensal.replace(",", ".")) || 0,
        status:            form.status,
        servicos:          form.servicos,
        indicado_por:      form.indicado_por.trim(),
        observacoes:       form.observacoes.trim(),
      };
      const idEditado = editando?.id ?? null;
      if (editando) await editarPipelineItem(editando.id, payload, editando, vendedores);
      else           await criarPipelineItem(payload);
      markClean();
      await carregar();
      // Se estava editando, recarrega logs e permanece na tela
      if (idEditado) {
        setEditando((prev) => prev ? { ...prev, ...payload, vendedor_nome: vendedores.find(v => v.id === payload.vendedor_id)?.nome ?? null } : null);
        setTimeout(() => carregarLogs(idEditado), 400);
        setErroForm(null);
      } else {
        setView("list"); setEditando(null); setLogs([]);
      }
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally { setSalvando(false); }
  }

  async function handleExcluir(id: string) {
    setExcluindo(id);
    try { await excluirPipelineItem(id); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : "Erro ao excluir."); }
    finally { setExcluindo(null); }
  }

  function handleConverter(item: PipelineItem) {
    setConvertendo(item.id);
    onConverter(item);
  }

  const ativos = registros.filter((r) => !["fechado", "declinado"].includes(r.status));
  const totalImplantacao = ativos.reduce((acc, r) => acc + r.valor_implantacao, 0);
  const totalMensal      = ativos.reduce((acc, r) => acc + r.valor_mensal, 0);

  // ── Formulário + Histórico ─────────────────────────────────

  if (view === "form") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button onClick={cancelar} className="text-sm text-gray-400 hover:text-gray-600">← Voltar</button>
          <h2 className="text-lg font-bold text-gray-900">{editando ? `Editando — ${editando.cliente}` : "Nova proposta"}</h2>
        </div>

        {editando?.convertido_em_venda && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <span className="mt-0.5 text-amber-500">⚠</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Esta proposta já foi convertida em venda.</p>
              <p className="text-xs text-amber-600">Alterações aqui podem gerar inconsistência com a venda criada. As edições serão registradas no histórico.</p>
            </div>
          </div>
        )}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Início do lead *</label>
              <input type="date" value={form.data_inicio_lead} onChange={(e) => set("data_inicio_lead", e.target.value)} required className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value as StatusPipeline)} className={INPUT}>
                {STATUS_PIPELINE.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Cliente *</label>
              <input type="text" value={form.cliente} onChange={(e) => set("cliente", e.target.value)} required placeholder="Nome do cliente"
                disabled={!!editando?.convertido_em_venda}
                className={`${INPUT} disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`} />
              {editando?.convertido_em_venda && <p className="text-[11px] text-amber-600">Campo bloqueado após conversão em venda.</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Vendedor</label>
              <select value={form.vendedor_id} onChange={(e) => set("vendedor_id", e.target.value)} className={INPUT}>
                <option value="">Selecione...</option>
                {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Indicado por</label>
              <input type="text" value={form.indicado_por} onChange={(e) => set("indicado_por", e.target.value)} placeholder="Nome do indicador" className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Temperatura</label>
              <select value={form.temperatura} onChange={(e) => set("temperatura", e.target.value as Temperatura)} className={INPUT}>
                {TEMPERATURAS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Implantação (R$)</label>
              <input type="number" min="0" step="0.01" value={form.valor_implantacao} onChange={(e) => set("valor_implantacao", e.target.value)} placeholder="0,00"
                disabled={!!editando?.convertido_em_venda}
                className={`${INPUT} disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`} />
              {editando?.convertido_em_venda && <p className="text-[11px] text-amber-600">Campo bloqueado após conversão em venda.</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Mensal (R$)</label>
              <input type="number" min="0" step="0.01" value={form.valor_mensal} onChange={(e) => set("valor_mensal", e.target.value)} placeholder="0,00"
                disabled={!!editando?.convertido_em_venda}
                className={`${INPUT} disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`} />
              {editando?.convertido_em_venda && <p className="text-[11px] text-amber-600">Campo bloqueado após conversão em venda.</p>}
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className={LABEL}>Serviços</label>
              <CheckboxServicos value={form.servicos} onChange={(v) => set("servicos", v)} disabled={!!editando?.convertido_em_venda} />
              {editando?.convertido_em_venda && <p className="text-[11px] text-amber-600">Campo bloqueado após conversão em venda.</p>}
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Observações</label>
              <textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} placeholder="Informações adicionais sobre a proposta..." className={`${INPUT} resize-none`} />
            </div>
            {erroForm && <div className="sm:col-span-2"><Alert status="error" message={erroForm} /></div>}
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={salvando} className="rounded-2xl bg-folk-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60">
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Adicionar ao pipeline"}
              </button>
              <button type="button" onClick={cancelar} className="rounded-2xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300">Cancelar</button>
            </div>
          </form>
        </Card>

        {/* Histórico — só aparece na edição */}
        {editando && (
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-800">Histórico de alterações</h3>

            {carregandoLogs && <p className="text-sm text-gray-400">Carregando...</p>}

            {!carregandoLogs && logsVisiveis.length === 0 && (
              <p className="text-sm text-gray-400">Nenhuma alteração registrada ainda.</p>
            )}

            {!carregandoLogs && logsVisiveis.length > 0 && (
              <div>
                {logsVisiveis.map((log, i) => {
                  const cfg = CAMPO_CONFIG[log.campo] ?? { label: log.campo, dot: "bg-gray-300" };
                  const isConversao = log.campo === "conversao";
                  const isPosConversao = log.campo === "edicao_pos_conversao";
                  return (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                        {i < logsVisiveis.length - 1 && <div className="w-px flex-1 bg-gray-100 my-1" />}
                      </div>
                      <div className={`${i < logsVisiveis.length - 1 ? "pb-4" : ""} min-w-0`}>
                        <p className="text-[11px] text-gray-400 mb-0.5">
                          {formatLogTs(log.created_at)}
                          {log.autor_nome && <span className="ml-1">· {log.autor_nome}</span>}
                        </p>
                        {isConversao ? (
                          <p className="text-sm font-semibold text-emerald-700">✓ Proposta convertida em venda</p>
                        ) : isPosConversao ? (
                          <p className="text-sm font-semibold text-amber-600">⚠ Proposta editada após conversão</p>
                        ) : (
                          <>
                            <p className="text-xs font-semibold text-gray-500">{cfg.label}</p>
                            <p className="text-sm text-gray-700">{formatLogMsg(log)}</p>
                          </>
                        )}
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
      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Temperatura</label>
            <select value={filtros.temperatura} onChange={(e) => setFiltros((f) => ({ ...f, temperatura: e.target.value as Temperatura | "" }))} className={INPUT}>
              <option value="">Todas</option>
              {TEMPERATURAS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Status</label>
            <select value={filtros.status} onChange={(e) => setFiltros((f) => ({ ...f, status: e.target.value as StatusPipeline | "" }))} className={INPUT}>
              <option value="">Todos</option>
              {STATUS_PIPELINE.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">{carregando ? "Carregando..." : `${registros.length} proposta${registros.length !== 1 ? "s" : ""}`}</p>
          {ativos.length > 0 && (
            <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
              {totalImplantacao > 0 && <span>Implantação: <span className="text-folk">{formatMoeda(totalImplantacao)}</span></span>}
              {totalImplantacao > 0 && totalMensal > 0 && <span className="text-gray-300">·</span>}
              {totalMensal > 0 && <span>MRR potencial: <span className="text-emerald-600">{formatMoeda(totalMensal)}/mês</span></span>}
            </div>
          )}
        </div>
        <button onClick={abrirNovo} className="rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]">
          + Nova proposta
        </button>
      </div>

      {erro && <Alert status="error" message={erro} />}

      {!carregando && registros.length === 0 && !erro && (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">Nenhuma proposta no pipeline.</div>
      )}

      {registros.length > 0 && (
        <div className="flex flex-col gap-3">
          {registros.map((r) => (
            <div key={r.id} className={`rounded-2xl border border-gray-200 bg-white shadow-sm border-l-4 ${TEMP_BORDA[r.temperatura]}`}>
              <div className="flex items-start justify-between gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{r.cliente}</p>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TEMP_BADGE[r.temperatura]}`}>
                      {labelTemperatura(r.temperatura)}
                    </span>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[r.status]}`}>
                      {labelStatusPipeline(r.status)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    {r.vendedor_nome && <><span>{r.vendedor_nome}</span><span>·</span></>}
                    {r.indicado_por  && <><span>Indicado por {r.indicado_por}</span><span>·</span></>}
                    <span>Lead desde {formatData(r.data_inicio_lead)}</span>
                    {(r.valor_implantacao > 0 || r.valor_mensal > 0) && (
                      <><span>·</span><span className="font-semibold text-gray-600">
                        {r.valor_implantacao > 0 && r.valor_mensal > 0
                          ? `${formatMoeda(r.valor_implantacao)} + ${formatMoeda(r.valor_mensal)}/mês`
                          : r.valor_implantacao > 0
                          ? formatMoeda(r.valor_implantacao)
                          : `${formatMoeda(r.valor_mensal)}/mês`}
                      </span></>
                    )}
                  </div>
                  {r.servicos?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.servicos.map((s) => (
                        <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{s}</span>
                      ))}
                    </div>
                  )}
                  {r.observacoes && <p className="mt-2 text-xs text-gray-400 italic">{r.observacoes}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => abrirEditar(r)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-folk/30 hover:text-folk">Editar</button>
                    <button onClick={() => handleExcluir(r.id)} disabled={excluindo === r.id} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50">
                      {excluindo === r.id ? "..." : "Excluir"}
                    </button>
                  </div>
                  {r.convertido_em_venda ? (
                    <button
                      onClick={onIrParaVendas}
                      className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100"
                    >
                      ✓ Convertido — Ver vendas
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConverter(r)}
                      disabled={convertendo === r.id}
                      className="rounded-lg border border-folk/30 px-3 py-1.5 text-xs font-semibold text-folk transition-colors hover:bg-folk/5 disabled:opacity-50"
                    >
                      {convertendo === r.id ? "Abrindo..." : "→ Converter em venda"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
