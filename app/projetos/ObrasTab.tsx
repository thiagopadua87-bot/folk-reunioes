"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listarObras, criarObra, editarObra, excluirObra,
  listarLogsObra,
  SITUACOES_OBRA, EQUIPES, ANDAMENTOS,
  labelSituacaoObra, labelEquipe, formatData, formatMoeda,
  calcularDiasExecucao, calcularDiasRestantes,
  type Obra, type ObraLog, type ObraPayload, type SituacaoObra, type Equipe, type Andamento, type FiltrosObras,
} from "@/lib/projetos";
import { listarTecnicos, listarTerceirizados, type Tecnico, type Terceirizado } from "@/lib/cadastros";
import { SERVICOS_COMERCIAL } from "@/lib/comercial";
import { Card, Alert } from "@/app/components/ui";

// ── Estilos ──────────────────────────────────────────────────

const SITUACAO_BADGE: Record<SituacaoObra, string> = {
  a_executar:  "bg-gray-100 text-gray-600 border-gray-200",
  em_execucao: "bg-folk/10 text-folk border-folk/20",
  paralizada:  "bg-red-100 text-red-700 border-red-200",
  finalizada:  "bg-green-100 text-green-700 border-green-200",
};

const SITUACAO_BORDA: Record<SituacaoObra, string> = {
  a_executar:  "border-l-gray-300",
  em_execucao: "border-l-folk",
  paralizada:  "border-l-red-400",
  finalizada:  "border-l-green-400",
};

const CAMPO_CONFIG: Record<string, { label: string; dot: string }> = {
  data_inicio:    { label: "Data de início",        dot: "bg-blue-400" },
  data_prazo:     { label: "Prazo estimado",         dot: "bg-amber-400" },
  situacao:       { label: "Situação",               dot: "bg-folk" },
  equipe:         { label: "Equipe",                 dot: "bg-purple-400" },
  tecnico:        { label: "Técnico",                dot: "bg-gray-400" },
  terceirizado:   { label: "Terceirizado",           dot: "bg-orange-400" },
  valor_execucao: { label: "Valor de execução",      dot: "bg-green-400" },
  andamento:      { label: "Andamento",              dot: "bg-green-500" },
};

function formatLogTs(s: string): string {
  const d = new Date(s);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " +
         d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ── Sub-componentes ──────────────────────────────────────────

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

function BarraAndamento({ valor }: { valor: number }) {
  const cor = valor === 100 ? "bg-green-500" : valor >= 60 ? "bg-folk" : valor >= 40 ? "bg-amber-400" : "bg-gray-300";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${valor}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-500">{valor}%</span>
    </div>
  );
}

// ── Form ─────────────────────────────────────────────────────

interface FormState {
  data_inicio: string;
  data_prazo: string;
  cliente: string;
  servicos: string[];
  situacao: SituacaoObra;
  equipe: Equipe;
  tecnico_id: string;
  terceirizado_id: string;
  valor_execucao: string;
  andamento: string;
}

const FORM_VAZIO: FormState = {
  data_inicio: "", data_prazo: "", cliente: "", servicos: [],
  situacao: "a_executar", equipe: "equipe_propria",
  tecnico_id: "", terceirizado_id: "", valor_execucao: "", andamento: "0",
};

const INPUT = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10 w-full";
const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";

// ── Componente principal ─────────────────────────────────────

export default function ObrasTab() {
  const [obras, setObras]           = useState<Obra[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState<string | null>(null);
  const [view, setView]             = useState<"list" | "form">("list");
  const [editando, setEditando]     = useState<Obra | null>(null);
  const [form, setForm]             = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando]     = useState(false);
  const [erroForm, setErroForm]     = useState<string | null>(null);
  const [excluindo, setExcluindo]   = useState<string | null>(null);
  const [filtros, setFiltros]       = useState<FiltrosObras>({ situacao: "", equipe: "" });
  const [logs, setLogs]             = useState<ObraLog[]>([]);
  const [carregandoLogs, setCarregandoLogs] = useState(false);
  const [tecnicos, setTecnicos]         = useState<Tecnico[]>([]);
  const [terceirizados, setTerceirizados] = useState<Terceirizado[]>([]);

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try { setObras(await listarObras({ situacao: filtros.situacao || undefined, equipe: filtros.equipe || undefined })); }
    catch (e) { setErro(e instanceof Error ? e.message : "Erro ao carregar."); }
    finally { setCarregando(false); }
  }, [filtros]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    listarTecnicos({ ativo: true }).then(setTecnicos).catch(() => {});
    listarTerceirizados({ ativo: true }).then(setTerceirizados).catch(() => {});
  }, []);

  async function carregarLogs(id: string) {
    setCarregandoLogs(true);
    try { setLogs(await listarLogsObra(id)); }
    catch { setLogs([]); }
    finally { setCarregandoLogs(false); }
  }

  function abrirNovo() { setEditando(null); setForm(FORM_VAZIO); setErroForm(null); setLogs([]); setView("form"); }
  function abrirEditar(o: Obra) {
    setEditando(o);
    setForm({
      data_inicio:     o.data_inicio,
      data_prazo:      o.data_prazo ?? "",
      cliente:         o.cliente,
      servicos:        o.servicos ?? [],
      situacao:        o.situacao,
      equipe:          o.equipe,
      tecnico_id:      o.tecnico_id ?? "",
      terceirizado_id: o.terceirizado_id ?? "",
      valor_execucao:  o.valor_execucao ? String(o.valor_execucao) : "",
      andamento:       String(o.andamento),
    });
    setErroForm(null); setView("form"); carregarLogs(o.id);
  }
  function cancelar() { setView("list"); setEditando(null); setErroForm(null); setLogs([]); }
  function set<K extends keyof FormState>(k: K, v: FormState[K]) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.data_inicio || !form.cliente) { setErroForm("Preencha todos os campos obrigatórios."); return; }
    setSalvando(true); setErroForm(null);
    try {
      const andamento = parseInt(form.andamento) as Andamento;
      const finalizada = andamento === 100;
      const payload: ObraPayload = {
        data_inicio:     form.data_inicio,
        data_prazo:      form.data_prazo || null,
        data_conclusao:  finalizada ? new Date().toISOString().slice(0, 10) : (editando?.data_conclusao ?? null),
        cliente:         form.cliente.trim(),
        servicos:        form.servicos,
        situacao:        finalizada ? "finalizada" as SituacaoObra : form.situacao,
        equipe:          form.equipe,
        tecnico_id:      form.equipe === "equipe_propria" ? (form.tecnico_id || null) : null,
        terceirizado_id: form.equipe === "terceiro" ? (form.terceirizado_id || null) : null,
        valor_execucao:  form.equipe === "terceiro" ? (parseFloat(form.valor_execucao.replace(",", ".")) || 0) : 0,
        andamento,
      };
      const idEditado = editando?.id ?? null;
      if (editando) await editarObra(editando.id, payload, editando, tecnicos, terceirizados);
      else           await criarObra(payload);
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
    try { await excluirObra(id); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : "Erro ao excluir."); }
    finally { setExcluindo(null); }
  }

  // ── Formulário + Histórico ─────────────────────────────────

  if (view === "form") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button onClick={cancelar} className="text-sm text-gray-400 hover:text-gray-600">← Voltar</button>
          <h2 className="text-lg font-bold text-gray-900">{editando ? `Editando — ${editando.cliente}` : "Nova obra"}</h2>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Data de início *</label>
              <input type="date" value={form.data_inicio} onChange={(e) => set("data_inicio", e.target.value)} required className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Prazo estimado de conclusão</label>
              <input type="date" value={form.data_prazo} onChange={(e) => set("data_prazo", e.target.value)} className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Situação</label>
              <select value={form.situacao} onChange={(e) => set("situacao", e.target.value as SituacaoObra)} disabled={form.andamento === "100"} className={INPUT}>
                {SITUACOES_OBRA.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Cliente *</label>
              <input type="text" value={form.cliente} onChange={(e) => set("cliente", e.target.value)} required placeholder="Nome do cliente" className={INPUT} />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className={LABEL}>Serviços</label>
              <CheckboxServicos value={form.servicos} onChange={(v) => set("servicos", v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Equipe</label>
              <select value={form.equipe} onChange={(e) => {
                const eq = e.target.value as Equipe;
                setForm((p) => ({ ...p, equipe: eq, tecnico_id: "", terceirizado_id: "", valor_execucao: "" }));
              }} className={INPUT}>
                {EQUIPES.map((eq) => <option key={eq.value} value={eq.value}>{eq.label}</option>)}
              </select>
            </div>
            {form.equipe === "equipe_propria" && (
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Técnico</label>
                <select value={form.tecnico_id} onChange={(e) => set("tecnico_id", e.target.value)} className={INPUT}>
                  <option value="">Selecionar técnico</option>
                  {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
            )}
            {form.equipe === "terceiro" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL}>Terceirizado</label>
                  <select value={form.terceirizado_id} onChange={(e) => set("terceirizado_id", e.target.value)} className={INPUT}>
                    <option value="">Selecionar terceirizado</option>
                    {terceirizados.map((t) => <option key={t.id} value={t.id}>{t.nome_empresa}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL}>Valor de execução (R$)</label>
                  <input type="number" min="0" step="0.01" value={form.valor_execucao} onChange={(e) => set("valor_execucao", e.target.value)} placeholder="0,00" className={INPUT} />
                </div>
              </>
            )}
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Andamento</label>
              <select
                value={form.andamento}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((p) => ({ ...p, andamento: v, situacao: v === "100" ? "finalizada" : p.situacao === "finalizada" ? "em_execucao" : p.situacao }));
                }}
                className={INPUT}
              >
                {ANDAMENTOS.map((a) => <option key={a} value={a}>{a}%</option>)}
              </select>
            </div>
            {erroForm && <div className="sm:col-span-2"><Alert status="error" message={erroForm} /></div>}
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={salvando} className="rounded-2xl bg-folk-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60">
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar obra"}
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

  // ── Listagem ───────────────────────────────────────────────

  return (
    <div>
      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Situação</label>
            <select value={filtros.situacao} onChange={(e) => setFiltros((f) => ({ ...f, situacao: e.target.value as SituacaoObra | "" }))} className={INPUT}>
              <option value="">Todas</option>
              {SITUACOES_OBRA.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Equipe</label>
            <select value={filtros.equipe} onChange={(e) => setFiltros((f) => ({ ...f, equipe: e.target.value as Equipe | "" }))} className={INPUT}>
              <option value="">Todas</option>
              {EQUIPES.map((eq) => <option key={eq.value} value={eq.value}>{eq.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">{carregando ? "Carregando..." : `${obras.length} obra${obras.length !== 1 ? "s" : ""}`}</p>
        <button onClick={abrirNovo} className="rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]">+ Nova obra</button>
      </div>

      {erro && <Alert status="error" message={erro} />}

      {!carregando && obras.length === 0 && !erro && (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">Nenhuma obra encontrada.</div>
      )}

      {obras.length > 0 && (
        <div className="flex flex-col gap-3">
          {obras.map((o) => (
            <div key={o.id} className={`rounded-2xl border border-gray-200 bg-white shadow-sm border-l-4 ${SITUACAO_BORDA[o.situacao]}`}>
              <div className="flex items-start justify-between gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{o.cliente}</p>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${SITUACAO_BADGE[o.situacao]}`}>
                      {labelSituacaoObra(o.situacao)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span>{labelEquipe(o.equipe)}{o.equipe === "equipe_propria" && o.tecnico_nome ? ` — ${o.tecnico_nome}` : o.equipe === "terceiro" && o.terceirizado_nome ? ` — ${o.terceirizado_nome}` : ""}</span>
                    {o.equipe === "terceiro" && o.valor_execucao > 0 && <><span>·</span><span>{formatMoeda(o.valor_execucao)}</span></>}
                    <span>·</span>
                    <span>Início: {formatData(o.data_inicio)}</span>
                    {o.data_prazo && <><span>·</span><span>Prazo: {formatData(o.data_prazo)}</span></>}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <BarraAndamento valor={o.andamento} />
                    {(() => {
                      const dias = calcularDiasExecucao(o);
                      const restantes = calcularDiasRestantes(o);
                      return (
                        <>
                          <span className="text-xs text-gray-400">
                            {o.situacao === "finalizada" ? `Concluída em ${dias} dia${dias !== 1 ? "s" : ""}` : `${dias} dia${dias !== 1 ? "s" : ""} em execução`}
                          </span>
                          {restantes !== null && (
                            <span className={`text-xs font-semibold ${restantes < 0 ? "text-red-500" : restantes <= 7 ? "text-amber-500" : "text-gray-400"}`}>
                              {restantes < 0 ? `${Math.abs(restantes)}d em atraso` : restantes === 0 ? "Prazo: hoje" : `${restantes}d restantes`}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  {o.servicos?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {o.servicos.map((s) => <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{s}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => abrirEditar(o)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-folk/30 hover:text-folk">Editar</button>
                  <button onClick={() => handleExcluir(o.id)} disabled={excluindo === o.id} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50">
                    {excluindo === o.id ? "..." : "Excluir"}
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
