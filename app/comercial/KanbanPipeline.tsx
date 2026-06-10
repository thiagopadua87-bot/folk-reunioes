"use client";

import { useState } from "react";
import {
  STATUS_PIPELINE, labelTemperatura, formatMoeda, formatData,
  type PipelineItem, type StatusPipeline, type Temperatura,
} from "@/lib/comercial";
import type { Competitor, SindicoGestor } from "@/lib/cadastros";

// ── Configuração de colunas ──────────────────────────────────

const COLUNAS_ATIVAS = [
  { status: "lead_cadastrado"      as StatusPipeline, label: "Lead Cadastrado",        cor: "bg-slate-50 border-slate-200",   cabecalho: "text-slate-700 bg-slate-100",   ponto: "bg-slate-400" },
  { status: "apresentacao_empresa" as StatusPipeline, label: "Apresentação da Empresa", cor: "bg-blue-50 border-blue-200",     cabecalho: "text-blue-700 bg-blue-100",     ponto: "bg-blue-500" },
  { status: "proposta_analise"     as StatusPipeline, label: "Proposta em Análise",     cor: "bg-amber-50 border-amber-200",   cabecalho: "text-amber-700 bg-amber-100",   ponto: "bg-amber-500" },
  { status: "assembleia_marcada"   as StatusPipeline, label: "Assembleia Marcada",      cor: "bg-purple-50 border-purple-200", cabecalho: "text-purple-700 bg-purple-100", ponto: "bg-purple-500" },
  { status: "assinatura_contrato"  as StatusPipeline, label: "Assinatura de Contrato",  cor: "bg-folk/5 border-folk/20",       cabecalho: "text-folk bg-folk/10",          ponto: "bg-folk" },
];

const COLUNAS_ENCERRADAS = [
  { status: "fechado"   as StatusPipeline, label: "Fechado",   cor: "bg-emerald-50 border-emerald-200", cabecalho: "text-emerald-700 bg-emerald-100", ponto: "bg-emerald-500" },
  { status: "declinado" as StatusPipeline, label: "Declinado", cor: "bg-red-50 border-red-200",         cabecalho: "text-red-600 bg-red-100",         ponto: "bg-red-500" },
];

const TEMP_COR: Record<Temperatura, string> = {
  fria:   "border-blue-400",
  morna:  "border-amber-400",
  quente: "border-red-400",
};

const TEMP_BADGE: Record<Temperatura, string> = {
  fria:   "bg-blue-100 text-blue-700",
  morna:  "bg-amber-100 text-amber-700",
  quente: "bg-red-100 text-red-700",
};

// ── Helpers ──────────────────────────────────────────────────

function formatarCNPJ(v: string): string {
  const d = v.replace(/\D/g, "");
  if (d.length !== 14) return v;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

type AcaoStatus = "none" | "future" | "today" | "overdue";

function calcAcaoStatus(datahora: string | null): { tipo: AcaoStatus; diasAtraso: number } {
  if (!datahora) return { tipo: "none", diasAtraso: 0 };
  const d    = new Date(datahora);
  const agora = new Date();
  const hoje  = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
  if (d < hoje) {
    const dias = Math.max(1, Math.floor((hoje.getTime() - d.getTime()) / 86_400_000));
    return { tipo: "overdue", diasAtraso: dias };
  }
  if (d < amanha) return { tipo: "today", diasAtraso: 0 };
  return { tipo: "future", diasAtraso: 0 };
}

function formatAcaoTs(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " +
         d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function calcInteracaoStatus(dt: string | null): { dias: number; cls: string; texto: string } {
  if (!dt) return { dias: 999, cls: "text-gray-400", texto: "Sem registro" };
  const dias = Math.floor((Date.now() - new Date(dt).getTime()) / 86_400_000);
  if (dias <= 7)  return { dias, cls: "text-green-600",  texto: `${dias}d atrás` };
  if (dias <= 20) return { dias, cls: "text-amber-600",  texto: `${dias}d atrás` };
  return           { dias, cls: "text-red-600",   texto: `⚠ ${dias}d atrás` };
}

// ── Props ────────────────────────────────────────────────────

interface KanbanPipelineProps {
  registros: PipelineItem[];
  allCompetitors: Competitor[];
  allSindicosGestores: SindicoGestor[];
  excluindo: string | null;
  convertendo: string | null;
  onEditar: (item: PipelineItem) => void;
  onExcluir: (id: string) => void;
  onConverter: (item: PipelineItem) => void;
  onIrParaVendas: () => void;
  onMoverCard: (itemId: string, novoStatus: StatusPipeline, statusAnterior: StatusPipeline) => Promise<void>;
}

// ── Componente principal ─────────────────────────────────────

export default function KanbanPipeline({
  registros, allCompetitors, allSindicosGestores,
  excluindo, convertendo,
  onEditar, onExcluir, onConverter, onIrParaVendas, onMoverCard,
}: KanbanPipelineProps) {
  const [mostrarEncerradas, setMostrarEncerradas] = useState(false);
  const [draggedId, setDraggedId]           = useState<string | null>(null);
  const [dropTarget, setDropTarget]         = useState<string | null>(null);
  const [movendo, setMovendo]               = useState<string | null>(null);

  const colunas = mostrarEncerradas
    ? [...COLUNAS_ATIVAS, ...COLUNAS_ENCERRADAS]
    : COLUNAS_ATIVAS;

  const porStatus = (status: StatusPipeline) =>
    registros.filter((r) => r.status === status);

  async function handleDrop(novoStatus: StatusPipeline) {
    if (!draggedId) return;
    const item = registros.find((r) => r.id === draggedId);
    if (!item || item.status === novoStatus) {
      setDraggedId(null); setDropTarget(null); return;
    }
    setMovendo(draggedId);
    setDraggedId(null); setDropTarget(null);
    try {
      await onMoverCard(draggedId, novoStatus, item.status);
    } finally {
      setMovendo(null);
    }
  }

  const encerradasCount =
    registros.filter((r) => r.status === "fechado").length +
    registros.filter((r) => r.status === "declinado").length;

  return (
    <div className="flex flex-col gap-3">
      {/* Botão toggle encerradas */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {registros.length} oportunidade{registros.length !== 1 ? "s" : ""}
        </p>
        <button
          type="button"
          onClick={() => setMostrarEncerradas((v) => !v)}
          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
            mostrarEncerradas
              ? "border-gray-300 bg-gray-100 text-gray-700"
              : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
          }`}
        >
          {mostrarEncerradas ? "Ocultar encerradas" : `Mostrar oportunidades encerradas (${encerradasCount})`}
        </button>
      </div>

      {/* Board */}
      <div className="overflow-x-auto pb-2">
        <div
          className="flex gap-3"
          style={{ minWidth: `${colunas.length * 272 + (colunas.length - 1) * 12}px` }}
        >
          {colunas.map((col) => {
            const items   = porStatus(col.status);
            const isOver  = dropTarget === col.status;
            return (
              <div
                key={col.status}
                className={`flex w-68 shrink-0 flex-col rounded-2xl border transition-colors ${col.cor} ${
                  isOver ? "ring-2 ring-folk/40" : ""
                }`}
                style={{ width: 268 }}
                onDragOver={(e) => { e.preventDefault(); setDropTarget(col.status); }}
                onDragLeave={(e) => {
                  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
                    setDropTarget(null);
                  }
                }}
                onDrop={() => handleDrop(col.status)}
              >
                {/* Cabeçalho da coluna */}
                <div className={`flex items-center justify-between rounded-t-2xl px-3 py-2.5 ${col.cabecalho}`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${col.ponto}`} />
                    <span className="text-xs font-bold">{col.label}</span>
                  </div>
                  <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[11px] font-bold tabular-nums">
                    {items.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 overflow-y-auto p-2" style={{ maxHeight: "calc(100vh - 320px)", minHeight: 80 }}>
                  {items.length === 0 && (
                    <div className={`flex h-14 items-center justify-center rounded-xl border-2 border-dashed text-[11px] text-gray-400 transition-colors ${
                      isOver ? "border-folk/40 bg-folk/5" : "border-gray-200"
                    }`}>
                      Solte aqui
                    </div>
                  )}
                  {items.map((item) => (
                    <KanbanCard
                      key={item.id}
                      item={item}
                      allCompetitors={allCompetitors}
                      allSindicosGestores={allSindicosGestores}
                      isDragging={draggedId === item.id}
                      isMovendo={movendo === item.id}
                      excluindo={excluindo}
                      convertendo={convertendo}
                      onEditar={onEditar}
                      onExcluir={onExcluir}
                      onConverter={onConverter}
                      onIrParaVendas={onIrParaVendas}
                      onDragStart={() => setDraggedId(item.id)}
                      onDragEnd={() => { setDraggedId(null); setDropTarget(null); }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────

interface KanbanCardProps {
  item: PipelineItem;
  allCompetitors: Competitor[];
  allSindicosGestores: SindicoGestor[];
  isDragging: boolean;
  isMovendo: boolean;
  excluindo: string | null;
  convertendo: string | null;
  onEditar: (item: PipelineItem) => void;
  onExcluir: (id: string) => void;
  onConverter: (item: PipelineItem) => void;
  onIrParaVendas: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function KanbanCard({
  item, allCompetitors, allSindicosGestores,
  isDragging, isMovendo, excluindo, convertendo,
  onEditar, onExcluir, onConverter, onIrParaVendas,
  onDragStart, onDragEnd,
}: KanbanCardProps) {
  const sindico = item.sindico_gestor_id
    ? allSindicosGestores.find((s) => s.id === item.sindico_gestor_id) ?? null
    : null;

  const winnerName = item.winner_competitor_id
    ? (() => {
        const c = allCompetitors.find((x) => x.id === item.winner_competitor_id);
        return c ? (c.trade_name || c.legal_name) : null;
      })()
    : null;

  const acao = calcAcaoStatus(item.proxima_acao_datahora);

  const acaoBg = acao.tipo === "overdue" ? "bg-red-50 border-red-200"
               : acao.tipo === "today"   ? "bg-amber-50 border-amber-200"
               : acao.tipo === "future"  ? "bg-green-50 border-green-200"
               : "";
  const acaoTxt = acao.tipo === "overdue" ? "text-red-600"
                : acao.tipo === "today"   ? "text-amber-600"
                : "text-green-600";

  const servicos = item.servicos ?? [];
  const SERVICO_ABREV: Record<string, string> = {
    "Portaria Remota": "PR",
    "CFTV": "CFTV",
    "Alarme": "AL",
    "Monitoramento de Alarme": "MON",
    "Controle de Acesso": "CA",
    "Retrofit": "RET",
    "Aditivo de contrato": "ADIT",
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group rounded-xl border bg-white shadow-sm transition-all cursor-grab active:cursor-grabbing border-l-4 select-none ${TEMP_COR[item.temperatura]} ${
        isDragging ? "opacity-40 scale-[0.97]" : ""
      } ${isMovendo ? "opacity-60 pointer-events-none" : ""}`}
    >
      <div className="px-3 pt-2.5 pb-2">
        {/* Cliente + temperatura */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2 flex-1">{item.cliente}</p>
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${TEMP_BADGE[item.temperatura]}`}>
            {labelTemperatura(item.temperatura)}
          </span>
        </div>

        {/* CNPJ */}
        {item.cnpj && (
          <p className="text-[10px] text-gray-400 mb-1 font-mono">{formatarCNPJ(item.cnpj)}</p>
        )}

        {/* Síndico/Gestor */}
        {sindico && (
          <p className="text-[10px] text-gray-500 mb-1">
            <span className="font-semibold">{sindico.nome}</span>
            <span className="text-gray-400"> · {sindico.tipo}</span>
          </p>
        )}

        {/* Vendedor + Indicado por */}
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-1.5 text-[10px] text-gray-400">
          {item.vendedor_nome && <span>{item.vendedor_nome}</span>}
          {item.indicado_por  && <span>Via {item.indicado_por}</span>}
        </div>

        {/* Valores */}
        {(item.valor_implantacao > 0 || item.valor_mensal > 0) && (
          <p className="text-[10px] font-semibold text-gray-700 mb-1.5">
            {item.valor_implantacao > 0 && item.valor_mensal > 0
              ? `${formatMoeda(item.valor_implantacao)} + ${formatMoeda(item.valor_mensal)}/mês`
              : item.valor_implantacao > 0
              ? formatMoeda(item.valor_implantacao)
              : `${formatMoeda(item.valor_mensal)}/mês`}
          </p>
        )}

        {/* Serviços */}
        {servicos.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {servicos.map((s) => (
              <span key={s} className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-600">
                {SERVICO_ABREV[s] ?? s.slice(0, 4)}
              </span>
            ))}
          </div>
        )}

        {/* Data entrada lead */}
        <p className="text-[10px] text-gray-400">Lead desde {formatData(item.data_inicio_lead)}</p>

        {/* Declinado: concorrente vencedor */}
        {winnerName && (
          <p className="mt-1 text-[10px] font-semibold text-red-500">✗ {winnerName}</p>
        )}

        {/* Assembleia marcada */}
        {item.status === "assembleia_marcada" && item.data_assembleia && (
          <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2 py-1">
            <span className="text-[11px]">📅</span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wide text-purple-700">Assembleia</p>
              <p className="text-[10px] text-purple-600">
                {new Date(item.data_assembleia).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                {" às "}
                {new Date(item.data_assembleia).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        )}

        {/* Próxima ação */}
        {acao.tipo !== "none" && item.proxima_acao_datahora && (
          <div className={`mt-2 rounded-lg border px-2 py-1 ${acaoBg}`}>
            <p className={`text-[10px] font-semibold ${acaoTxt}`}>
              {acao.tipo === "overdue"
                ? `Ação atrasada há ${acao.diasAtraso} dia${acao.diasAtraso !== 1 ? "s" : ""}`
                : acao.tipo === "today"
                ? "Ação para hoje"
                : formatAcaoTs(item.proxima_acao_datahora)}
            </p>
            {item.proxima_acao_tipo && (
              <p className={`text-[9px] ${acaoTxt} opacity-80`}>{item.proxima_acao_tipo}</p>
            )}
          </div>
        )}

        {/* Última interação + status Google Calendar */}
        <div className="mt-1.5 flex items-center justify-between gap-1">
          {(() => {
            const interacao = calcInteracaoStatus(item.ultima_interacao);
            return (
              <p className={`text-[9px] font-medium ${interacao.cls}`}>
                Último contato {interacao.texto}
              </p>
            );
          })()}
          {item.google_sync_status === "sincronizado" && (
            <span title="Sincronizado com Google Calendar" className="text-[9px] text-blue-500 font-semibold">
              📅
            </span>
          )}
        </div>

        {/* Ações do card */}
        <div className="mt-2 flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEditar(item)}
            className="flex-1 rounded-lg border border-gray-200 py-1 text-[10px] font-semibold text-gray-500 hover:border-folk/30 hover:text-folk transition-colors"
          >
            Editar
          </button>
          {item.convertido_em_venda ? (
            <button
              onClick={onIrParaVendas}
              className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              ✓ Venda
            </button>
          ) : (
            <button
              onClick={() => onConverter(item)}
              disabled={convertendo === item.id}
              className="flex-1 rounded-lg border border-folk/20 py-1 text-[10px] font-semibold text-folk hover:bg-folk/5 transition-colors disabled:opacity-50"
            >
              {convertendo === item.id ? "..." : "Converter"}
            </button>
          )}
          <button
            onClick={() => onExcluir(item.id)}
            disabled={excluindo === item.id}
            className="rounded-lg border border-red-100 px-2 py-1 text-[10px] font-semibold text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {excluindo === item.id ? "..." : "✕"}
          </button>
        </div>
      </div>
    </div>
  );
}
