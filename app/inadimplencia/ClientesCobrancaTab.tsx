"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import {
  listarFaturas, listarAcoesCliente, registrarAcao, listarTiposAcao,
  importarFaturas, atualizarStatusFatura, buscarUltimasAcoes, listarResponsaveis,
  STATUS_FATURA, STATUS_NEGOCIACAO, deriveStatusNegociacao,
  type Fatura, type InadimplenciaAcao, type TipoAcaoCobranca,
  type StatusFatura, type StatusNegociacao, type UltimaAcaoFatura,
  type LinhaImportacao, type ResultadoImportacao, type InadimplenciaResponsavel,
} from "@/lib/cobranca";

// ── Constants ──────────────────────────────────────────────────────

const HOJE = new Date().toISOString().slice(0, 10);
const INPUT_CLS = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-folk focus:ring-2 focus:ring-folk/10";
const LABEL_CLS = "block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1";

const ORDENACOES = [
  { value: "atraso",    label: "Maior atraso" },
  { value: "valor",     label: "Maior valor" },
  { value: "faturas",   label: "Mais faturas" },
  { value: "nome",      label: "A–Z" },
  { value: "interacao", label: "Última interação" },
  { value: "proxima",   label: "Próxima ação" },
] as const;
type Ordenacao = (typeof ORDENACOES)[number]["value"];

const FAIXAS_ATRASO = [
  { value: "",       label: "Todos" },
  { value: "30",     label: "Até 30 dias" },
  { value: "31-60",  label: "31–60 dias" },
  { value: "61-90",  label: "61–90 dias" },
  { value: "91-120", label: "91–120 dias" },
  { value: "120+",   label: "Acima de 120" },
];
const FAIXAS_VALOR = [
  { value: "",         label: "Todos" },
  { value: "1000",     label: "Até R$ 1.000" },
  { value: "1000-5000", label: "R$ 1.000–5.000" },
  { value: "5000+",    label: "Acima de R$ 5.000" },
];

type FiltroRapido = "criticos" | "promessa_hoje" | "sem_acao" | "negociacao" | "juridico" | null;

// ── Types ──────────────────────────────────────────────────────────

interface ClienteCobranca {
  cliente: string;
  faturas: Fatura[];
  totalAberto: number;
  quantidade: number;
  maiorAtraso: number;
  menorVencimento: string;
  statusNegociacao: StatusNegociacao;
  ultimaAcao: UltimaAcaoFatura | null;
  responsavelNome: string | null;
  responsavelId: string | null;
  diasSemAcao: number;
}

// ── Helpers ────────────────────────────────────────────────────────

function fmt(v: number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtData(iso: string) {
  if (!iso) return "—";
  return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR");
}
function diasEmAtraso(venc: string): number {
  const h = new Date(); h.setHours(0, 0, 0, 0);
  return Math.floor((h.getTime() - new Date(venc + "T00:00:00").getTime()) / 86_400_000);
}
function diasDesde(iso: string): number {
  const h = new Date(); h.setHours(0, 0, 0, 0);
  return Math.floor((h.getTime() - new Date(iso).getTime()) / 86_400_000);
}
function scoreCor(maiorAtraso: number, total: number) {
  if (maiorAtraso > 120 || total > 10000) return "bg-red-500";
  if (maiorAtraso > 60)  return "bg-orange-400";
  if (maiorAtraso > 30)  return "bg-amber-400";
  return "bg-emerald-500";
}
function findUltimaAcaoCliente(
  faturaIds: string[],
  mapa: Map<string, UltimaAcaoFatura>,
): UltimaAcaoFatura | null {
  let melhor: UltimaAcaoFatura | null = null;
  for (const fid of faturaIds) {
    const a = mapa.get(fid);
    if (a && (!melhor || a.created_at > melhor.created_at)) melhor = a;
  }
  return melhor;
}

// ── Sub-components ─────────────────────────────────────────────────

function BadgeNeg({ status }: { status: StatusNegociacao }) {
  const s = STATUS_NEGOCIACAO.find((x) => x.value === status)!;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${s.cor}`}>
      {s.label}
    </span>
  );
}

function BadgeStatus({ status }: { status: StatusFatura }) {
  const s = STATUS_FATURA.find((x) => x.value === status);
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s?.cor ?? "bg-gray-100 text-gray-600"}`}>
      {s?.label ?? status}
    </span>
  );
}

function KPIIndicador({
  label, value, ativo, onClick, cor,
}: {
  label: string; value: string | number; ativo: boolean; onClick: () => void; cor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col rounded-2xl border p-4 text-left shadow-sm transition-all min-w-[100px] ${
        ativo
          ? "border-folk bg-folk/5 ring-2 ring-folk/20"
          : "border-gray-200 bg-white hover:border-folk/30 hover:shadow-md"
      }`}
    >
      <p className={`text-2xl font-black leading-none ${cor ?? "text-gray-900"}`}>{value}</p>
      <p className="mt-1 text-[11px] font-medium leading-tight text-gray-400">{label}</p>
    </button>
  );
}

function TimelineHistorico({ acoes, loading }: { acoes: InadimplenciaAcao[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-folk" />
        <p className="text-xs text-gray-400">Carregando histórico...</p>
      </div>
    );
  }
  if (acoes.length === 0) {
    return <p className="text-xs italic text-gray-400 py-2">Nenhuma ação registrada.</p>;
  }
  return (
    <ul className="relative space-y-3 before:absolute before:left-[6px] before:top-2 before:bottom-2 before:w-px before:bg-gray-100">
      {acoes.map((a) => (
        <li key={a.id} className="flex gap-3 pl-1">
          <div className="mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-folk/40 bg-white" />
          <div className="flex-1 pb-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-semibold text-gray-800">{a.tipo_acao}</span>
              <span className="text-[11px] text-gray-400">
                {new Date(a.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                {a.usuario_nome ? ` · ${a.usuario_nome}` : ""}
              </span>
            </div>
            {a.descricao && <p className="mt-0.5 text-sm text-gray-600">{a.descricao}</p>}
            {a.proxima_acao && (
              <p className="mt-0.5 text-xs font-medium text-folk">
                Próxima: {a.proxima_acao}
                {a.data_proxima_acao ? ` — ${fmtData(a.data_proxima_acao)}` : ""}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── CardCliente ────────────────────────────────────────────────────

function CardCliente({
  cliente, tiposAcao, usuarioId, onRecarregar,
}: {
  cliente: ClienteCobranca;
  tiposAcao: TipoAcaoCobranca[];
  usuarioId: string;
  onRecarregar: () => Promise<void>;
}) {
  const [expandido,    setExpandido] = useState(false);
  const [acoes,        setAcoes]     = useState<InadimplenciaAcao[]>([]);
  const [loadingAcoes, setLoadA]     = useState(false);
  const [carregou,     setCarregou]  = useState(false);
  const [mostraForm,   setMF]        = useState(false);
  const [salvando,     setSalvando]  = useState(false);
  const [erroForm,     setErro]      = useState("");
  const [form, setForm] = useState({
    tipo_acao: "", descricao: "", proxima_acao: "",
    data_proxima_acao: "", novo_status: "" as StatusFatura | "",
  });

  async function handleExpand() {
    const novo = !expandido;
    setExpandido(novo);
    if (novo && !carregou) {
      setLoadA(true);
      try {
        setAcoes(await listarAcoesCliente(cliente.faturas.map((f) => f.id)));
        setCarregou(true);
      } finally { setLoadA(false); }
    }
  }

  async function handleSalvarAcao() {
    if (!form.tipo_acao) { setErro("Selecione o tipo de ação."); return; }
    setSalvando(true); setErro("");
    try {
      const faturaAlvo = cliente.faturas[0];
      await registrarAcao({
        fatura_id:         faturaAlvo.id,
        usuario_id:        usuarioId,
        tipo_acao:         form.tipo_acao,
        descricao:         form.descricao || undefined,
        proxima_acao:      form.proxima_acao || undefined,
        data_proxima_acao: form.data_proxima_acao || undefined,
        novo_status:       form.novo_status || undefined,
      });
      setForm({ tipo_acao: "", descricao: "", proxima_acao: "", data_proxima_acao: "", novo_status: "" });
      setMF(false);
      setAcoes(await listarAcoesCliente(cliente.faturas.map((f) => f.id)));
      await onRecarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally { setSalvando(false); }
  }

  const cor        = scoreCor(cliente.maiorAtraso, cliente.totalAberto);
  const faturaAlvo = cliente.faturas[0];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Cabeçalho do card */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Nome + score */}
            <div className="mb-1.5 flex items-center gap-2.5">
              <span className={`h-3 w-3 shrink-0 rounded-full ${cor}`} title={`Maior atraso: ${cliente.maiorAtraso}d · Total: ${fmt(cliente.totalAberto)}`} />
              <p className="truncate text-base font-bold text-gray-900">{cliente.cliente}</p>
            </div>

            {/* Métricas resumidas */}
            <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>{cliente.quantidade} fatura{cliente.quantidade !== 1 ? "s" : ""} em aberto</span>
              <span className="font-semibold text-gray-800">{fmt(cliente.totalAberto)}</span>
              {cliente.maiorAtraso > 0 && (
                <span className="font-semibold text-red-600">{cliente.maiorAtraso}d de atraso</span>
              )}
              <span>Primeiro venc.: {fmtData(cliente.menorVencimento)}</span>
              {cliente.responsavelNome && (
                <span>Responsável: <strong className="text-gray-700">{cliente.responsavelNome}</strong></span>
              )}
            </div>

            {/* Badges */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <BadgeNeg status={cliente.statusNegociacao} />
              {cliente.maiorAtraso > 120 && (
                <span className="rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                  Crítico
                </span>
              )}
            </div>

            {/* Última ação */}
            {cliente.ultimaAcao ? (
              <div className="space-y-0.5 text-xs text-gray-500">
                <p>
                  <span className="font-semibold text-gray-700">{cliente.ultimaAcao.tipo_acao}</span>
                  {" em "}{fmtData(cliente.ultimaAcao.created_at.slice(0, 10))}
                  {cliente.ultimaAcao.usuario_nome ? ` · ${cliente.ultimaAcao.usuario_nome}` : ""}
                </p>
                {cliente.ultimaAcao.proxima_acao && (
                  <p className="font-medium text-folk">
                    Próxima: {cliente.ultimaAcao.proxima_acao}
                    {cliente.ultimaAcao.data_proxima_acao
                      ? ` — ${fmtData(cliente.ultimaAcao.data_proxima_acao)}`
                      : ""}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs italic text-gray-400">Nenhuma ação registrada</p>
            )}
          </div>

          {/* Botão expand */}
          <button
            onClick={handleExpand}
            className="shrink-0 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:border-folk hover:text-folk"
          >
            {expandido ? "▲ Fechar" : "▼ Ver detalhes"}
          </button>
        </div>
      </div>

      {/* Painel expandido */}
      {expandido && (
        <div className="space-y-5 border-t border-gray-100 bg-gray-50/40 px-5 pb-6 pt-4">
          {/* Form de ação */}
          {!mostraForm ? (
            <button
              onClick={() => setMF(true)}
              className="rounded-xl bg-folk px-4 py-2 text-sm font-semibold text-white"
            >
              + Registrar ação
            </button>
          ) : (
            <div className="space-y-3 rounded-2xl border border-folk/20 bg-folk/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-700">Nova ação de cobrança</p>
                {faturaAlvo && (
                  <p className="text-[11px] text-gray-400">
                    Ação registrada na NF {faturaAlvo.numero_nota}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className={LABEL_CLS}>Tipo de ação *</label>
                  <select
                    value={form.tipo_acao}
                    onChange={(e) => setForm((p) => ({ ...p, tipo_acao: e.target.value }))}
                    className={`w-full ${INPUT_CLS}`}
                  >
                    <option value="">Selecione...</option>
                    {tiposAcao.filter((t) => t.ativo).map((t) => (
                      <option key={t.id} value={t.nome}>{t.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className={LABEL_CLS}>
                    Alterar status — NF {faturaAlvo?.numero_nota}
                  </label>
                  <select
                    value={form.novo_status}
                    onChange={(e) => setForm((p) => ({ ...p, novo_status: e.target.value as StatusFatura | "" }))}
                    className={`w-full ${INPUT_CLS}`}
                  >
                    <option value="">
                      Manter ({STATUS_FATURA.find((s) => s.value === faturaAlvo?.status)?.label ?? faturaAlvo?.status})
                    </option>
                    {STATUS_FATURA.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className={LABEL_CLS}>Descrição / observação</label>
                  <textarea
                    value={form.descricao}
                    onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                    rows={2}
                    placeholder="O que foi dito / acordado..."
                    className={`w-full ${INPUT_CLS}`}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>Próxima ação</label>
                  <input
                    value={form.proxima_acao}
                    onChange={(e) => setForm((p) => ({ ...p, proxima_acao: e.target.value }))}
                    placeholder="Ex: Ligar novamente"
                    className={`w-full ${INPUT_CLS}`}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>Data da próxima ação</label>
                  <input
                    type="date"
                    value={form.data_proxima_acao}
                    onChange={(e) => setForm((p) => ({ ...p, data_proxima_acao: e.target.value }))}
                    className={`w-full ${INPUT_CLS}`}
                  />
                </div>
              </div>

              {erroForm && <p className="text-xs text-red-600">{erroForm}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSalvarAcao}
                  disabled={salvando}
                  className="rounded-xl bg-folk px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
                <button
                  onClick={() => { setMF(false); setErro(""); }}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de faturas */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">
              Faturas em aberto ({cliente.quantidade})
            </p>
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs">
                    <th className="py-2 pl-3 text-left font-semibold uppercase tracking-wide text-gray-500">NF</th>
                    <th className="py-2 px-2 text-left font-semibold uppercase tracking-wide text-gray-500">Vencimento</th>
                    <th className="py-2 px-2 text-right font-semibold uppercase tracking-wide text-gray-500">Valor</th>
                    <th className="py-2 px-2 text-center font-semibold uppercase tracking-wide text-gray-500">Atraso</th>
                    <th className="py-2 px-2 text-left font-semibold uppercase tracking-wide text-gray-500">Status</th>
                    <th className="py-2 pr-3 text-left font-semibold uppercase tracking-wide text-gray-500">Alterar</th>
                  </tr>
                </thead>
                <tbody>
                  {cliente.faturas.map((f, i) => {
                    const dias = diasEmAtraso(f.data_vencimento);
                    return (
                      <tr key={f.id} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? "" : "bg-gray-50/40"}`}>
                        <td className="py-2.5 pl-3 font-semibold text-gray-800">{f.numero_nota}</td>
                        <td className="py-2.5 px-2 text-gray-600">{fmtData(f.data_vencimento)}</td>
                        <td className="py-2.5 px-2 text-right font-semibold text-gray-800">{fmt(f.valor)}</td>
                        <td className="py-2.5 px-2 text-center">
                          {dias > 0 ? (
                            <span className={`text-xs font-bold ${dias > 120 ? "text-red-600" : dias > 60 ? "text-orange-500" : dias > 30 ? "text-amber-500" : "text-gray-600"}`}>
                              {dias}d
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-600">A vencer</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2"><BadgeStatus status={f.status} /></td>
                        <td className="py-2.5 pr-3">
                          <div className="flex flex-wrap gap-1">
                            {STATUS_FATURA.filter((s) => s.value !== f.status).map((s) => (
                              <button
                                key={s.value}
                                onClick={async () => {
                                  await atualizarStatusFatura(f.id, s.value);
                                  await onRecarregar();
                                }}
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${s.cor}`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Histórico */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">
              Histórico de interações
            </p>
            <TimelineHistorico acoes={acoes} loading={loadingAcoes} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────

export default function ClientesCobrancaTab() {
  const [faturas,      setFaturas]      = useState<Fatura[]>([]);
  const [ultimasAcoes, setUltimasAcoes] = useState<Map<string, UltimaAcaoFatura>>(new Map());
  const [responsaveis, setResponsaveis] = useState<InadimplenciaResponsavel[]>([]);
  const [tiposAcao,    setTiposAcao]    = useState<TipoAcaoCobranca[]>([]);
  const [usuarioId,    setUsuarioId]    = useState("");
  const [loading,      setLoading]      = useState(true);
  const [erro,         setErro]         = useState("");
  const [importando,   setImportando]   = useState(false);
  const [resultado,    setResultado]    = useState<ResultadoImportacao | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Filtros
  const [busca,             setBusca]       = useState("");
  const [filtroStatus,      setFS]          = useState<StatusNegociacao | "">("");
  const [filtroFaixa,       setFF]          = useState("");
  const [filtroValor,       setFV]          = useState("");
  const [filtroResponsavel, setFR]          = useState("");
  const [ordenacao,         setOrdenacao]   = useState<Ordenacao>("atraso");
  const [filtroRapido,      setFiltroRapido] = useState<FiltroRapido>(null);

  // ── Carregamento ─────────────────────────────────────────────────

  const isFirstLoad = useRef(true);

  const carregar = useCallback(async () => {
    if (isFirstLoad.current) setLoading(true);
    setErro("");
    try {
      const [lista, tipos, resps, { data: userData }] = await Promise.all([
        listarFaturas({ somente_abertas: true }),
        listarTiposAcao(true),
        listarResponsaveis(),
        supabase.auth.getUser(),
      ]);
      if (userData.user) setUsuarioId(userData.user.id);
      setFaturas(lista);
      setTiposAcao(tipos);
      setResponsaveis(resps);
      if (lista.length > 0) {
        setUltimasAcoes(await buscarUltimasAcoes(lista.map((f) => f.id)));
      } else {
        setUltimasAcoes(new Map());
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
      isFirstLoad.current = false;
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Agrupamento por cliente ──────────────────────────────────────

  const respPorCliente = useMemo(() => {
    const m = new Map<string, { nome: string | null; id: string }>();
    responsaveis.forEach((r) => { m.set(r.cliente, { nome: r.usuario_nome ?? null, id: r.usuario_id }); });
    return m;
  }, [responsaveis]);

  const clientes = useMemo((): ClienteCobranca[] => {
    const mapa = new Map<string, Fatura[]>();
    for (const f of faturas) {
      if (!mapa.has(f.cliente)) mapa.set(f.cliente, []);
      mapa.get(f.cliente)!.push(f);
    }
    return Array.from(mapa.entries()).map(([nome, fats]) => {
      const sorted     = [...fats].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
      const total      = sorted.reduce((s, f) => s + Number(f.valor), 0);
      const maiorAtraso = Math.max(0, ...sorted.map((f) => diasEmAtraso(f.data_vencimento)));
      const ultimaAcao = findUltimaAcaoCliente(sorted.map((f) => f.id), ultimasAcoes);
      const resp       = respPorCliente.get(nome);
      return {
        cliente:          nome,
        faturas:          sorted,
        totalAberto:      total,
        quantidade:       sorted.length,
        maiorAtraso,
        menorVencimento:  sorted[0]?.data_vencimento ?? "",
        statusNegociacao: deriveStatusNegociacao(sorted, ultimaAcao),
        ultimaAcao,
        responsavelNome:  resp?.nome ?? null,
        responsavelId:    resp?.id ?? null,
        diasSemAcao:      ultimaAcao ? diasDesde(ultimaAcao.created_at) : 999,
      };
    });
  }, [faturas, ultimasAcoes, respPorCliente]);

  // ── Indicadores ──────────────────────────────────────────────────

  const ind = useMemo(() => ({
    total:        clientes.length,
    valorTotal:   clientes.reduce((s, c) => s + c.totalAberto, 0),
    criticos:     clientes.filter((c) => c.maiorAtraso > 120).length,
    promessaHoje: clientes.filter((c) => c.ultimaAcao?.data_proxima_acao === HOJE).length,
    semAcao15d:   clientes.filter((c) => c.diasSemAcao > 15).length,
    negociacao:   clientes.filter((c) => ["negociacao", "aguardando"].includes(c.statusNegociacao)).length,
    juridico:     clientes.filter((c) => c.statusNegociacao === "juridico").length,
  }), [clientes]);

  // ── Filtro + Ordenação ───────────────────────────────────────────

  const clientesFiltrados = useMemo(() => {
    let lista = clientes;

    if (filtroRapido === "criticos")      lista = lista.filter((c) => c.maiorAtraso > 120);
    if (filtroRapido === "promessa_hoje") lista = lista.filter((c) => c.ultimaAcao?.data_proxima_acao === HOJE);
    if (filtroRapido === "sem_acao")      lista = lista.filter((c) => c.diasSemAcao > 15);
    if (filtroRapido === "negociacao")    lista = lista.filter((c) => ["negociacao", "aguardando"].includes(c.statusNegociacao));
    if (filtroRapido === "juridico")      lista = lista.filter((c) => c.statusNegociacao === "juridico");

    if (busca) {
      const b = busca.toLowerCase();
      lista = lista.filter((c) =>
        c.cliente.toLowerCase().includes(b) ||
        c.faturas.some((f) => f.numero_nota.toLowerCase().includes(b))
      );
    }
    if (filtroStatus) lista = lista.filter((c) => c.statusNegociacao === filtroStatus);
    if (filtroFaixa) {
      lista = lista.filter((c) => {
        const d = c.maiorAtraso;
        if (filtroFaixa === "30")      return d <= 30;
        if (filtroFaixa === "31-60")   return d >= 31 && d <= 60;
        if (filtroFaixa === "61-90")   return d >= 61 && d <= 90;
        if (filtroFaixa === "91-120")  return d >= 91 && d <= 120;
        if (filtroFaixa === "120+")    return d > 120;
        return true;
      });
    }
    if (filtroValor) {
      lista = lista.filter((c) => {
        const v = c.totalAberto;
        if (filtroValor === "1000")      return v <= 1000;
        if (filtroValor === "1000-5000") return v > 1000 && v <= 5000;
        if (filtroValor === "5000+")     return v > 5000;
        return true;
      });
    }
    if (filtroResponsavel) lista = lista.filter((c) => c.responsavelId === filtroResponsavel);

    return [...lista].sort((a, b) => {
      if (ordenacao === "atraso")    return b.maiorAtraso - a.maiorAtraso;
      if (ordenacao === "valor")     return b.totalAberto - a.totalAberto;
      if (ordenacao === "faturas")   return b.quantidade - a.quantidade;
      if (ordenacao === "nome")      return a.cliente.localeCompare(b.cliente, "pt-BR");
      if (ordenacao === "interacao") return a.diasSemAcao - b.diasSemAcao;
      if (ordenacao === "proxima") {
        const da = a.ultimaAcao?.data_proxima_acao ?? "9999";
        const db = b.ultimaAcao?.data_proxima_acao ?? "9999";
        return da.localeCompare(db);
      }
      return 0;
    });
  }, [clientes, filtroRapido, busca, filtroStatus, filtroFaixa, filtroValor, filtroResponsavel, ordenacao]);

  // ── Import planilha ──────────────────────────────────────────────

  function parseExcelDate(val: unknown): string {
    if (typeof val === "number" && val > 0) {
      const d = XLSX.SSF.parse_date_code(val);
      if (!d || !d.y) return "";
      return new Date(d.y, d.m - 1, d.d).toISOString().slice(0, 10);
    }
    if (typeof val === "string") {
      const p = val.split("/");
      if (p.length === 3 && p.every((x) => /^\d+$/.test(x.trim()))) {
        return `${p[2].trim().slice(0, 4)}-${p[1].trim().padStart(2, "0")}-${p[0].trim().padStart(2, "0")}`;
      }
      if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
    }
    return "";
  }

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo || !usuarioId) return;
    setImportando(true); setErro(""); setResultado(null);
    try {
      const buf  = await arquivo.arrayBuffer();
      const wb   = XLSX.read(buf, { type: "array" });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" });
      const linhas: LinhaImportacao[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row        = rows[i] as unknown[];
        const numeroNota = String(row[2] ?? "").trim();
        const cliente    = String(row[5] ?? "").trim();
        const vencRaw    = row[7];
        const valorRaw   = row[11];
        if (!numeroNota || !cliente) continue;
        const dataVencimento = parseExcelDate(vencRaw);
        const valor = typeof valorRaw === "number" ? valorRaw : parseFloat(String(valorRaw).replace(",", ".")) || 0;
        if (!dataVencimento) continue;
        linhas.push({ numero_nota: numeroNota, cliente, data_vencimento: dataVencimento, valor });
      }
      if (linhas.length === 0) { setErro("Nenhuma linha válida encontrada."); return; }
      const res = await importarFaturas(linhas, usuarioId);
      setResultado(res);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao processar planilha.");
    } finally {
      setImportando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ── Helpers render ───────────────────────────────────────────────

  const responsiaveisUnicos = useMemo(() => {
    const seen = new Set<string>();
    return responsaveis.filter((r) => {
      if (seen.has(r.usuario_id)) return false;
      seen.add(r.usuario_id); return true;
    });
  }, [responsaveis]);

  function toggleFiltroRapido(fr: NonNullable<FiltroRapido>) {
    setFiltroRapido((p) => (p === fr ? null : fr));
  }

  const filtroAtivo = filtroRapido || filtroStatus || filtroFaixa || filtroValor || filtroResponsavel || busca;

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Importação */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importando}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition-colors hover:border-folk hover:text-folk disabled:opacity-50"
        >
          {importando ? "Importando..." : "⬆ Importar Planilha"}
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleArquivo} />
      </div>

      {resultado && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <p className="font-semibold">Importação concluída</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>{resultado.criadas} fatura(s) criada(s)</li>
            <li>{resultado.atualizadas} fatura(s) atualizada(s)</li>
            <li>{resultado.quitadas} fatura(s) marcada(s) como recebida</li>
          </ul>
          {resultado.erros.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-red-600">{resultado.erros.length} erro(s)</summary>
              <ul className="mt-1 list-inside list-disc text-xs text-red-600">
                {resultado.erros.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
          <button onClick={() => setResultado(null)} className="mt-2 text-xs text-green-600 underline">Fechar</button>
        </div>
      )}

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-folk" />
            <p className="text-sm text-gray-400">Carregando...</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPIs clicáveis */}
          <div className="flex flex-wrap gap-2">
            <KPIIndicador
              label="Clientes inadimplentes"
              value={ind.total}
              ativo={!filtroAtivo}
              onClick={() => { setFiltroRapido(null); setFS(""); setFF(""); setFV(""); setFR(""); setBusca(""); }}
              cor="text-gray-900"
            />
            <KPIIndicador
              label="Valor total em aberto"
              value={fmt(ind.valorTotal)}
              ativo={false}
              onClick={() => {}}
              cor="text-blue-700"
            />
            <KPIIndicador
              label="Críticos (+120 dias)"
              value={ind.criticos}
              ativo={filtroRapido === "criticos"}
              onClick={() => toggleFiltroRapido("criticos")}
              cor="text-red-700"
            />
            <KPIIndicador
              label="Promessas para hoje"
              value={ind.promessaHoje}
              ativo={filtroRapido === "promessa_hoje"}
              onClick={() => toggleFiltroRapido("promessa_hoje")}
              cor="text-blue-600"
            />
            <KPIIndicador
              label="Sem ação há +15 dias"
              value={ind.semAcao15d}
              ativo={filtroRapido === "sem_acao"}
              onClick={() => toggleFiltroRapido("sem_acao")}
              cor="text-amber-600"
            />
            <KPIIndicador
              label="Em negociação"
              value={ind.negociacao}
              ativo={filtroRapido === "negociacao"}
              onClick={() => toggleFiltroRapido("negociacao")}
              cor="text-purple-700"
            />
            <KPIIndicador
              label="Jurídico"
              value={ind.juridico}
              ativo={filtroRapido === "juridico"}
              onClick={() => toggleFiltroRapido("juridico")}
              cor="text-red-700"
            />
          </div>

          {/* Filtros */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-1">
                <label className={LABEL_CLS}>Buscar</label>
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Nome ou nº NF..."
                  className={`w-full ${INPUT_CLS}`}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Status negociação</label>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFS(e.target.value as StatusNegociacao | "")}
                  className={`w-full ${INPUT_CLS}`}
                >
                  <option value="">Todos</option>
                  {STATUS_NEGOCIACAO.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Faixa de atraso</label>
                <select value={filtroFaixa} onChange={(e) => setFF(e.target.value)} className={`w-full ${INPUT_CLS}`}>
                  {FAIXAS_ATRASO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Valor em aberto</label>
                <select value={filtroValor} onChange={(e) => setFV(e.target.value)} className={`w-full ${INPUT_CLS}`}>
                  {FAIXAS_VALOR.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>

            {responsiaveisUnicos.length > 0 && (
              <div className="mt-3">
                <div className="w-48">
                  <label className={LABEL_CLS}>Responsável</label>
                  <select value={filtroResponsavel} onChange={(e) => setFR(e.target.value)} className={`w-full ${INPUT_CLS}`}>
                    <option value="">Todos</option>
                    {responsiaveisUnicos.map((r) => (
                      <option key={r.usuario_id} value={r.usuario_id}>{r.usuario_nome ?? r.usuario_id}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Ordenação + contagem */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? "s" : ""}
              {filtroAtivo ? " (filtrados)" : ""} · {clientes.length} total
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ORDENACOES.map((op) => (
                <button
                  key={op.value}
                  onClick={() => setOrdenacao(op.value)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    ordenacao === op.value
                      ? "bg-folk text-white"
                      : "border border-gray-200 text-gray-500 hover:border-folk hover:text-folk"
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista */}
          {clientesFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
              <p className="text-sm text-gray-400">Nenhum cliente encontrado.</p>
              <p className="mt-1 text-xs text-gray-300">Ajuste os filtros ou importe uma planilha.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clientesFiltrados.map((c) => (
                <CardCliente
                  key={c.cliente}
                  cliente={c}
                  tiposAcao={tiposAcao}
                  usuarioId={usuarioId}
                  onRecarregar={carregar}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
