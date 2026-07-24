"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PropostaListItem, PipelineOption } from "@/lib/engenharia-comercial/propostas-db";
import { listarPropostas, listarPipelinesDisponiveis } from "@/lib/engenharia-comercial/propostas-db";
import { criarProposta } from "@/lib/engenharia-comercial/propostas-mutations";
import { StatusBadgeVersao } from "./propostas/[id]/components/StatusBadge";
import type { EcVersaoStatus } from "@/lib/engenharia-comercial/types";

// ── Constantes de estilo ──────────────────────────────────────

const INPUT   = "block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-folk focus:ring-2 focus:ring-folk/20";
const FOLK_BTN  = "rounded-xl bg-folk-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50";
const GHOST_BTN = "rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50";

// ── Formatadores ──────────────────────────────────────────────

function brl(v: number | null) {
  if (v == null) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

// ── Modal: Nova Proposta ──────────────────────────────────────

function NovaProposta({
  onClose,
  onCriada,
}: {
  onClose: () => void;
  onCriada: (id: string) => void;
}) {
  const [pipelines, setPipelines]   = useState<PipelineOption[]>([]);
  const [pipelineId, setPipelineId] = useState("");
  const [nome, setNome]             = useState("");
  const [descricao, setDescricao]   = useState("");
  const [salvando, setSalvando]     = useState(false);
  const [erro, setErro]             = useState<string | null>(null);
  const [busca, setBusca]           = useState("");

  useEffect(() => {
    listarPipelinesDisponiveis()
      .then(setPipelines)
      .catch(() => setErro("Erro ao carregar pipelines."));
  }, []);

  const pipelinesFiltrados = pipelines.filter(
    (p) =>
      !busca ||
      p.cliente.toLowerCase().includes(busca.toLowerCase()) ||
      p.responsavel.toLowerCase().includes(busca.toLowerCase())
  );

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!pipelineId) { setErro("Selecione um pipeline."); return; }
    if (!nome.trim()) { setErro("Informe o nome da proposta."); return; }
    setSalvando(true); setErro(null);
    try {
      const id = await criarProposta({ pipelineId, nome, descricao });
      onCriada(id);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Nova Proposta</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 5L5 15M5 5l10 10" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={salvar} className="space-y-4">
          {/* Pipeline */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Pipeline *
            </label>
            <input
              className={INPUT}
              placeholder="Buscar cliente ou responsável..."
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPipelineId(""); }}
            />
            {busca && pipelinesFiltrados.length > 0 && !pipelineId && (
              <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-md">
                {pipelinesFiltrados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex w-full flex-col px-3 py-2.5 text-left hover:bg-gray-50"
                    onClick={() => { setPipelineId(p.id); setBusca(p.cliente); }}
                  >
                    <span className="text-sm font-semibold text-gray-800">{p.cliente}</span>
                    {p.responsavel && <span className="text-xs text-gray-500">{p.responsavel}</span>}
                  </button>
                ))}
              </div>
            )}
            {busca && pipelinesFiltrados.length === 0 && (
              <p className="text-xs text-gray-400">Nenhum pipeline encontrado para "{busca}".</p>
            )}
          </div>

          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Nome da proposta *
            </label>
            <input
              className={INPUT}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: CFTV + Portaria Remota Premium"
              required
              autoFocus={!busca}
            />
          </div>

          {/* Descrição */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Descrição <span className="font-normal normal-case text-gray-400">(opcional)</span>
            </label>
            <textarea
              className={`${INPUT} resize-none`}
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Contexto interno sobre esta proposta..."
            />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={salvando} className={FOLK_BTN}>
              {salvando ? "Criando..." : "Criar Proposta →"}
            </button>
            <button type="button" onClick={onClose} className={GHOST_BTN}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Linha da tabela ───────────────────────────────────────────

function PropostaRow({ item }: { item: PropostaListItem }) {
  const implantacao = brl(item.valorImplantacao);
  const mensal      = brl(item.valorMensal);
  const margemPct   = item.margemPct;
  const margemCor   = margemPct == null ? "text-gray-400"
    : margemPct >= 20 ? "text-green-700"
    : margemPct >= 15 ? "text-amber-700"
    : "text-red-600";

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
      <td className="py-3.5 pl-5 pr-3">
        <Link
          href={`/engenharia-comercial/propostas/${item.propostaId}`}
          className="font-semibold text-gray-800 hover:text-folk"
        >
          {item.propostaNome}
        </Link>
        <p className="mt-0.5 text-xs text-gray-500">{item.cliente}</p>
      </td>

      <td className="py-3.5 pr-3">
        {item.versaoNumero != null && item.versaoStatus ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">V{item.versaoNumero}</span>
            <StatusBadgeVersao status={item.versaoStatus as EcVersaoStatus} small />
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>

      <td className="py-3.5 pr-3 text-right">
        {implantacao ? (
          <span className="text-sm font-semibold text-gray-800">{implantacao}</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>

      <td className="py-3.5 pr-3 text-right">
        {mensal ? (
          <span className="text-sm text-gray-700">{mensal}/mês</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>

      <td className="py-3.5 pr-5 text-right">
        {margemPct != null ? (
          <span className={`text-sm font-semibold ${margemCor}`}>{margemPct.toFixed(1)}%</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>

      <td className="py-3.5 pr-5">
        <Link
          href={`/engenharia-comercial/propostas/${item.propostaId}`}
          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
        >
          Abrir →
        </Link>
      </td>
    </tr>
  );
}

// ── Tab principal ─────────────────────────────────────────────

const STATUS_OPTS = [
  { value: "", label: "Todos os status" },
  { value: "rascunho",  label: "Rascunho" },
  { value: "ativa",     label: "Ativa" },
  { value: "encerrada", label: "Encerrada" },
  { value: "cancelada", label: "Cancelada" },
];

export default function PropostasTab() {
  const router = useRouter();

  const [propostas, setPropostas]   = useState<PropostaListItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [erro, setErro]             = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const [busca, setBusca]   = useState("");
  const [status, setStatus] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null);
    try {
      const data = await listarPropostas({
        busca:  busca || undefined,
        status: status || undefined,
      });
      setPropostas(data);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [busca, status]);

  useEffect(() => { void carregar(); }, [carregar]);

  function handleCriada(id: string) {
    setModalAberto(false);
    router.push(`/engenharia-comercial/propostas/${id}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-700">Propostas</h2>
          {!loading && (
            <p className="mt-0.5 text-xs text-gray-400">
              {propostas.length} {propostas.length === 1 ? "proposta" : "propostas"}
            </p>
          )}
        </div>
        <button onClick={() => setModalAberto(true)} className={FOLK_BTN}>
          + Nova Proposta
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className={`${INPUT} max-w-xs`}
          placeholder="Buscar proposta ou cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className={`${INPUT} w-auto`}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      {erro ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{erro}</div>
      ) : loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : propostas.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 py-14 text-center">
          <p className="text-sm font-semibold text-gray-500">Nenhuma proposta encontrada</p>
          <p className="mt-1 text-xs text-gray-400">
            {busca || status
              ? "Tente outros filtros"
              : "Clique em \"Nova Proposta\" para começar"}
          </p>
          {!busca && !status && (
            <button onClick={() => setModalAberto(true)} className={`${FOLK_BTN} mt-4`}>
              + Nova Proposta
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Proposta / Cliente", "Versão", "Implantação", "Mensal", "Margem", ""].map((h) => (
                  <th
                    key={h}
                    className={`py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 last:pr-5 ${
                      ["Implantação", "Mensal", "Margem"].includes(h) ? "text-right" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {propostas.map((item) => (
                <PropostaRow key={item.propostaId} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <NovaProposta
          onClose={() => setModalAberto(false)}
          onCriada={handleCriada}
        />
      )}
    </div>
  );
}
