"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  listarClientesPerdidos, criarClientePerdido, editarClientePerdido, excluirClientePerdido,
  listarLogsClientePerdido, listarHistoricoUnificado,
  formatarEventoClientePerdido,
  TIPOS_SERVICO, MOTIVOS_PERDA,
  labelTipoServico, labelMotivoPerda, formatMoeda, formatData,
  type ClientePerdido, type EventoHistorico, type TipoServico, type MotivoPerda,
  type FiltrosClientesPerdidos,
} from "@/lib/operacional";
import { listarCompetitors, type Competitor } from "@/lib/cadastros";
import { Card, Alert } from "@/app/components/ui";
import { useUnsavedChanges } from "@/lib/unsaved-changes";
import { supabase } from "@/lib/supabase";

// ── Tipos de formulário ──────────────────────────────────────

interface FormState {
  data_aviso: string;
  data_encerramento: string;
  cliente: string;
  tipo_servico: TipoServico;
  valor_contrato: string;
  motivo_perda: MotivoPerda;
  winner_competitor_id: string;
  observacoes: string;
}

const FORM_VAZIO: FormState = {
  data_aviso: "",
  data_encerramento: "",
  cliente: "",
  tipo_servico: "portaria_remota",
  valor_contrato: "",
  motivo_perda: "qualidade_servico",
  winner_competitor_id: "",
  observacoes: "",
};

function formParaPayload(
  f: FormState,
  existingRecord?: ClientePerdido,
): Omit<ClientePerdido, "id" | "user_id" | "created_at"> {
  return {
    crise_id: existingRecord?.crise_id ?? null,
    data_aviso: f.data_aviso,
    data_encerramento: f.data_encerramento,
    cliente: f.cliente.trim(),
    tipo_servico: f.tipo_servico,
    valor_contrato: parseFloat(f.valor_contrato.replace(",", ".")) || 0,
    motivo_perda: f.motivo_perda,
    winner_competitor_id: f.winner_competitor_id || null,
    observacoes: f.observacoes.trim(),
  };
}

function registroParaForm(r: ClientePerdido): FormState {
  return {
    data_aviso: r.data_aviso,
    data_encerramento: r.data_encerramento,
    cliente: r.cliente,
    tipo_servico: r.tipo_servico,
    valor_contrato: String(r.valor_contrato),
    motivo_perda: r.motivo_perda,
    winner_competitor_id: r.winner_competitor_id ?? "",
    observacoes: r.observacoes,
  };
}

// ── Helpers ──────────────────────────────────────────────────

function formatLogTs(s: string): string {
  const d = new Date(s);
  return (
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

// ── Estilos compartilhados ───────────────────────────────────

const INPUT =
  "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10 w-full";
const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";

// ── Props ─────────────────────────────────────────────────────

interface ClientesPerdidosProps {
  focoRegistroId?: string | null;
  onFocoConsumido?: () => void;
}

// ── Componente principal ─────────────────────────────────────

export default function ClientesPerdidos({
  focoRegistroId,
  onFocoConsumido,
}: ClientesPerdidosProps = {}) {
  const [registros, setRegistros]         = useState<ClientePerdido[]>([]);
  const [allCompetitors, setAllCompetitors] = useState<Competitor[]>([]);
  const [carregando, setCarregando]       = useState(true);
  const [erro, setErro]                   = useState<string | null>(null);
  const [isAdmin, setIsAdmin]             = useState(false);
  const [erroExclusao, setErroExclusao]   = useState<string | null>(null);
  const [view, setView]                   = useState<"list" | "form">("list");
  const [editando, setEditando]           = useState<ClientePerdido | null>(null);
  const [form, setForm]                   = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando]           = useState(false);
  const [erroForm, setErroForm]           = useState<string | null>(null);
  const [excluindo, setExcluindo]         = useState<string | null>(null);
  const [logs, setLogs]                   = useState<EventoHistorico[]>([]);
  const [carregandoLogs, setCarregandoLogs] = useState(false);
  const [highlightId, setHighlightId]     = useState<string | null>(null);

  // Modal histórico
  const [modalHistorico, setModalHistorico]           = useState<ClientePerdido | null>(null);
  const [historico, setHistorico]                     = useState<EventoHistorico[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  const [filtros, setFiltros] = useState<FiltrosClientesPerdidos>({
    dataInicio: "", dataFim: "", motivo: "", winnerCompetitorId: "",
  });

  const kpiTrimestres = useMemo(() => {
    const t1: ClientePerdido[] = [], t2: ClientePerdido[] = [], t3: ClientePerdido[] = [], t4: ClientePerdido[] = [];
    for (const r of registros) {
      const mes = parseInt(r.data_encerramento.slice(5, 7), 10);
      if (mes <= 3) t1.push(r);
      else if (mes <= 6) t2.push(r);
      else if (mes <= 9) t3.push(r);
      else t4.push(r);
    }
    return { t1, t2, t3, t4 };
  }, [registros]);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setIsAdmin(profile?.role === "admin");
    }
    checkAdmin();
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [data, comps] = await Promise.all([
        listarClientesPerdidos({
          dataInicio:         filtros.dataInicio         || undefined,
          dataFim:            filtros.dataFim            || undefined,
          motivo:             filtros.motivo             || undefined,
          winnerCompetitorId: filtros.winnerCompetitorId || undefined,
        }),
        listarCompetitors({ status: "ativo" }),
      ]);
      setRegistros(data);
      setAllCompetitors(comps);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar registros.");
    } finally {
      setCarregando(false);
    }
  }, [filtros]);

  useEffect(() => { carregar(); }, [carregar]);

  // Foco/highlight cross-tab: scroll + ring de 2s após dados carregados
  useEffect(() => {
    if (!focoRegistroId || carregando) return;
    setHighlightId(focoRegistroId);
    const el = document.getElementById(`cp-row-${focoRegistroId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => {
      setHighlightId(null);
      onFocoConsumido?.();
    }, 2000);
    return () => clearTimeout(timer);
  }, [focoRegistroId, carregando, onFocoConsumido]);

  const { markDirty, markClean, guardCancel } = useUnsavedChanges();

  async function carregarLogsForm(id: string) {
    setCarregandoLogs(true);
    try {
      const raw = await listarLogsClientePerdido(id);
      setLogs(raw.map(formatarEventoClientePerdido));
    } catch {
      setLogs([]);
    } finally {
      setCarregandoLogs(false);
    }
  }

  function abrirFormNovo() {
    setEditando(null); setForm(FORM_VAZIO); setErroForm(null); setLogs([]); markClean(); setView("form");
  }

  function abrirFormEditar(r: ClientePerdido) {
    setEditando(r); setForm(registroParaForm(r)); setErroForm(null); markClean(); setView("form");
    carregarLogsForm(r.id);
  }

  function cancelar() { guardCancel(() => { setView("list"); setEditando(null); setErroForm(null); setLogs([]); }); }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v })); markDirty();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.data_aviso || !form.data_encerramento || !form.cliente) {
      setErroForm("Preencha todos os campos obrigatórios.");
      return;
    }
    setSalvando(true);
    setErroForm(null);
    try {
      const payload = formParaPayload(form, editando ?? undefined);
      if (editando) await editarClientePerdido(editando.id, payload, editando);
      else           await criarClientePerdido(payload);
      markClean(); setView("list"); setEditando(null); await carregar();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(id: string) {
    if (!isAdmin) {
      setErroExclusao("Exclusão de registros é restrita a administradores. Entre em contato com o administrador do sistema.");
      return;
    }
    setExcluindo(id);
    try { await excluirClientePerdido(id); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : "Erro ao excluir."); }
    finally { setExcluindo(null); }
  }

  async function abrirHistorico(r: ClientePerdido) {
    setModalHistorico(r);
    setCarregandoHistorico(true);
    try {
      if (r.crise_id) {
        setHistorico(await listarHistoricoUnificado(r.crise_id, r.id));
      } else {
        const raw = await listarLogsClientePerdido(r.id);
        setHistorico(raw.map(formatarEventoClientePerdido));
      }
    } catch {
      setHistorico([]);
    } finally {
      setCarregandoHistorico(false);
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
            {editando ? "Editar registro" : "Novo cliente perdido"}
          </h2>
        </div>

        {editando?.crise_id && (
          <div className="mb-4">
            <Alert status="warning" message="Registro originado da Gestão de Crise. Consulte o histórico para ver a linha do tempo completa." />
          </div>
        )}

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Data do aviso *</label>
              <input type="date" value={form.data_aviso} onChange={(e) => set("data_aviso", e.target.value)} required className={INPUT} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Data de encerramento *</label>
              <input type="date" value={form.data_encerramento} onChange={(e) => set("data_encerramento", e.target.value)} required className={INPUT} />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Cliente *</label>
              <input type="text" value={form.cliente} onChange={(e) => set("cliente", e.target.value)} required placeholder="Nome do cliente" className={INPUT} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Tipo de serviço</label>
              <select value={form.tipo_servico} onChange={(e) => set("tipo_servico", e.target.value as TipoServico)} className={INPUT}>
                {TIPOS_SERVICO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Valor do contrato (R$)</label>
              <input type="number" min="0" step="0.01" value={form.valor_contrato} onChange={(e) => set("valor_contrato", e.target.value)} placeholder="0,00" className={INPUT} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Motivo da perda</label>
              <select value={form.motivo_perda} onChange={(e) => set("motivo_perda", e.target.value as MotivoPerda)} className={INPUT}>
                {MOTIVOS_PERDA.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Concorrente vencedor</label>
              <select value={form.winner_competitor_id} onChange={(e) => set("winner_competitor_id", e.target.value)} className={INPUT}>
                <option value="">Sem concorrente / não identificado</option>
                {allCompetitors.map((c) => (
                  <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>Observações</label>
              <textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} placeholder="Detalhes adicionais..." rows={3} className={`${INPUT} resize-none`} />
            </div>

            {erroForm && (
              <div className="sm:col-span-2">
                <Alert status="error" message={erroForm} />
              </div>
            )}

            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={salvando} className="rounded-2xl bg-folk-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60">
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar registro"}
              </button>
              <button type="button" onClick={cancelar} className="rounded-2xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300">
                Cancelar
              </button>
            </div>
          </form>
        </Card>

        {editando && (
          <Card className="mt-4 p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-800">
              Histórico{editando.crise_id ? " unificado (crise + cliente perdido)" : " de alterações"}
            </h3>
            {carregandoLogs && <p className="text-sm text-gray-400">Carregando...</p>}
            {!carregandoLogs && logs.length === 0 && (
              <p className="text-sm text-gray-400">Nenhuma alteração registrada ainda.</p>
            )}
            {!carregandoLogs && logs.length > 0 && (
              <div>
                {logs.map((ev, i) => (
                  <div key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="mt-0.5 text-base leading-none">{ev.icone}</span>
                      {i < logs.length - 1 && <div className="w-px flex-1 bg-gray-100 my-1" />}
                    </div>
                    <div className={`${i < logs.length - 1 ? "pb-4" : ""} min-w-0`}>
                      <p className="text-[11px] text-gray-400 mb-0.5">
                        {formatLogTs(ev.created_at)}
                        {ev.autor_nome && <span className="ml-1">· {ev.autor_nome}</span>}
                        {ev.fonte === "crise" && (
                          <span className="ml-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">crise</span>
                        )}
                      </p>
                      <p className="text-xs font-semibold text-gray-700">{ev.titulo}</p>
                      {ev.descricao && <p className="text-sm text-gray-500">{ev.descricao}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  // ── Listagem ────────────────────────────────────────────────

  return (
    <div>
      {/* Filtros */}
      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Data encerramento — de</label>
            <input type="date" value={filtros.dataInicio} onChange={(e) => setFiltros((f) => ({ ...f, dataInicio: e.target.value }))} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Data encerramento — até</label>
            <input type="date" value={filtros.dataFim} onChange={(e) => setFiltros((f) => ({ ...f, dataFim: e.target.value }))} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Motivo da perda</label>
            <select value={filtros.motivo} onChange={(e) => setFiltros((f) => ({ ...f, motivo: e.target.value as MotivoPerda | "" }))} className={INPUT}>
              <option value="">Todos</option>
              {MOTIVOS_PERDA.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Concorrente vencedor</label>
            <select value={filtros.winnerCompetitorId ?? ""} onChange={(e) => setFiltros((f) => ({ ...f, winnerCompetitorId: e.target.value }))} className={INPUT}>
              <option value="">Todos</option>
              {allCompetitors.map((c) => (
                <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Cabeçalho + botão novo */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {carregando ? "Carregando..." : `${registros.length} registro${registros.length !== 1 ? "s" : ""}`}
        </p>
        <button onClick={abrirFormNovo} className="rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]">
          + Novo registro
        </button>
      </div>

      {erro && <Alert status="error" message={erro} />}

      {erroExclusao && (
        <div className="mb-4">
          <Alert status="error" message={erroExclusao} />
        </div>
      )}

      {/* KPIs por trimestre */}
      {!carregando && registros.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {([
            { label: "T1", sub: "Jan–Mar", items: kpiTrimestres.t1, cls: "border-gray-200 bg-gray-50", txt: "text-gray-700" },
            { label: "T2", sub: "Abr–Jun", items: kpiTrimestres.t2, cls: "border-gray-200 bg-gray-50", txt: "text-gray-700" },
            { label: "T3", sub: "Jul–Set", items: kpiTrimestres.t3, cls: "border-gray-200 bg-gray-50", txt: "text-gray-700" },
            { label: "T4", sub: "Out–Dez", items: kpiTrimestres.t4, cls: "border-gray-200 bg-gray-50", txt: "text-gray-700" },
            { label: "Total", sub: "",     items: registros,         cls: "border-folk/20 bg-folk/5",   txt: "text-folk-dark" },
          ] as const).map(({ label, sub, items, cls, txt }) => (
            <div key={label} className={`rounded-2xl border px-4 py-3 ${cls}`}>
              <div className="mb-1">
                <p className={`text-xs font-semibold uppercase tracking-wide ${txt}`}>{label}</p>
                {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
              </div>
              <p className={`text-2xl font-bold ${txt}`}>{items.length}</p>
              {items.reduce((s, r) => s + r.valor_contrato, 0) > 0 && (
                <p className={`text-xs font-medium ${txt} mt-0.5 opacity-80`}>
                  {formatMoeda(items.reduce((s, r) => s + r.valor_contrato, 0))}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {!carregando && registros.length === 0 && !erro && (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
          Nenhum registro encontrado.
        </div>
      )}

      {registros.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="py-3 pl-6 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Encerramento</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Cliente</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo de serviço</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Valor</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Motivo</th>
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Concorrente</th>
                <th className="py-3 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr
                  key={r.id}
                  id={`cp-row-${r.id}`}
                  className={[
                    "border-b border-gray-100 last:border-0 transition-colors",
                    highlightId === r.id
                      ? "bg-folk/5 shadow-[inset_0_0_0_2px_theme(colors.folk/30%)]"
                      : "hover:bg-gray-50/50",
                  ].join(" ")}
                >
                  <td className="py-3.5 pl-6 pr-4 text-sm text-gray-700">{formatData(r.data_encerramento)}</td>
                  <td className="py-3.5 pr-4">
                    <p className="text-sm font-medium text-gray-900">{r.cliente}</p>
                    {r.crise_id && (
                      <button
                        onClick={() => abrirHistorico(r)}
                        className="mt-0.5 text-[11px] font-semibold text-amber-600 hover:underline"
                      >
                        Vindo da Gestão de Crise ↗
                      </button>
                    )}
                  </td>
                  <td className="py-3.5 pr-4 text-sm text-gray-500">{labelTipoServico(r.tipo_servico)}</td>
                  <td className="py-3.5 pr-4 text-sm text-gray-700">{formatMoeda(r.valor_contrato)}</td>
                  <td className="py-3.5 pr-4 text-sm text-gray-500">{labelMotivoPerda(r.motivo_perda)}</td>
                  <td className="py-3.5 pr-4 text-sm text-gray-500">
                    {r.winner_competitor_id
                      ? (() => {
                          const c = allCompetitors.find((x) => x.id === r.winner_competitor_id);
                          return c ? (c.trade_name || c.legal_name) : "—";
                        })()
                      : "—"}
                  </td>
                  <td className="py-3.5 pr-6">
                    <div className="flex items-center gap-2">
                      <button onClick={() => abrirHistorico(r)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-folk/30 hover:text-folk">
                        Histórico
                      </button>
                      <button onClick={() => abrirFormEditar(r)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-folk/30 hover:text-folk">
                        Editar
                      </button>
                      <button
                        onClick={() => handleExcluir(r.id)}
                        disabled={excluindo === r.id}
                        title={!isAdmin ? "Apenas administradores podem excluir registros" : ""}
                        className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
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

      {/* ── Modal: Histórico de movimentações ── */}
      {modalHistorico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Histórico de movimentações</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  {modalHistorico.cliente}
                  {modalHistorico.crise_id && (
                    <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                      crise + cliente perdido
                    </span>
                  )}
                </p>
              </div>
              <button onClick={() => setModalHistorico(null)} className="text-xl leading-none text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="overflow-y-auto px-6 py-5">
              {carregandoHistorico && <p className="text-sm text-gray-400">Carregando...</p>}
              {!carregandoHistorico && historico.length === 0 && (
                <p className="text-sm text-gray-400">Nenhuma movimentação registrada.</p>
              )}
              {!carregandoHistorico && historico.length > 0 && (
                <div>
                  {historico.map((ev, i) => (
                    <div key={ev.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="mt-0.5 text-base leading-none">{ev.icone}</span>
                        {i < historico.length - 1 && <div className="w-px flex-1 bg-gray-100 my-1" />}
                      </div>
                      <div className={`${i < historico.length - 1 ? "pb-4" : ""} min-w-0`}>
                        <p className="text-[11px] text-gray-400 mb-0.5">
                          {formatLogTs(ev.created_at)}
                          {ev.autor_nome && <span className="ml-1">· {ev.autor_nome}</span>}
                          {ev.fonte === "crise" && (
                            <span className="ml-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">crise</span>
                          )}
                        </p>
                        <p className="text-xs font-semibold text-gray-700">{ev.titulo}</p>
                        {ev.descricao && <p className="text-sm text-gray-500">{ev.descricao}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
