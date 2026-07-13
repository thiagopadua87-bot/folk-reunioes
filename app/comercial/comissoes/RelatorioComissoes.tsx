"use client";

import { useState, useCallback, useMemo } from "react";
import {
  listarComissoesHistorico, listarCompetencias,
  type Comissao, type StatusComissao,
  labelCompetencia, labelStatusComissao,
} from "@/lib/comissoes";
import { listarVendedores } from "@/lib/cadastros";
import { formatMoeda, formatData } from "@/lib/comercial";
import type { Vendedor } from "@/lib/cadastros";

function gerarCompetenciasRecentes(n = 12): string[] {
  const hoje = new Date();
  const result: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}

const STATUS_STYLE: Record<string, string> = {
  aguardando_liberacao: "bg-yellow-100 text-yellow-700",
  elegivel:             "bg-blue-100 text-blue-700",
  na_competencia:       "bg-indigo-100 text-indigo-700",
  aprovada:             "bg-emerald-100 text-emerald-700",
  paga:                 "bg-gray-100 text-gray-600",
  cancelada:            "bg-red-100 text-red-500",
};

const BADGE_TIPO: Record<string, string> = {
  consultor: "bg-folk/10 text-folk",
  gerente:   "bg-blue-100 text-blue-700",
  indicador: "bg-amber-100 text-amber-700",
};

interface LinhaVendedor {
  vendedor_id:   string;
  vendedor_nome: string;
  tipo:          string;
  qtd:           number;
  total:         number;
  por_status:    Partial<Record<StatusComissao, number>>;
  comissoes:     Comissao[];
}

export default function RelatorioComissoes() {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const mesTresAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
  const competenciaInicioPadrao = `${mesTresAtras.getFullYear()}-${String(mesTresAtras.getMonth() + 1).padStart(2, "0")}`;

  const [comissoes,   setComissoes]   = useState<Comissao[]>([]);
  const [vendedores,  setVendedores]  = useState<Vendedor[]>([]);
  const [carregando,  setCarregando]  = useState(false);
  const [carregado,   setCarregado]   = useState(false);
  const [erro,        setErro]        = useState<string | null>(null);
  const [expandido,   setExpandido]   = useState<string | null>(null);

  const [filtroInicio,  setFiltroInicio]  = useState(competenciaInicioPadrao);
  const [filtroFim,     setFiltroFim]     = useState(mesAtual);
  const [filtroVend,    setFiltroVend]    = useState("");
  const [filtroStatus,  setFiltroStatus]  = useState<StatusComissao | "">("");

  const opcoesCompetencia = useMemo(() => {
    return gerarCompetenciasRecentes(24);
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [hist, vends] = await Promise.all([
        listarComissoesHistorico({
          vendedorId:        filtroVend   || undefined,
          competenciaInicio: filtroInicio || undefined,
          competenciaFim:    filtroFim    || undefined,
          status:            (filtroStatus || undefined) as StatusComissao | undefined,
          limit:             1000,
        }),
        listarVendedores({ ativo: undefined }),
      ]);
      setComissoes(hist);
      setVendedores(vends);
      setCarregado(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setCarregando(false);
    }
  }, [filtroInicio, filtroFim, filtroVend, filtroStatus]);

  // Agrupa por vendedor
  const linhas: LinhaVendedor[] = useMemo(() => {
    const mapa = new Map<string, LinhaVendedor>();
    for (const c of comissoes) {
      const key = c.vendedor_id ?? c.indicador_ref_id ?? "";
      if (!mapa.has(key)) {
        mapa.set(key, {
          vendedor_id:   key,
          vendedor_nome: c.vendedor_nome ?? "—",
          tipo:          c.tipo_beneficiario,
          qtd:           0,
          total:         0,
          por_status:    {},
          comissoes:     [],
        });
      }
      const linha = mapa.get(key)!;
      linha.qtd++;
      linha.total += c.comissao_total;
      linha.por_status[c.status] = (linha.por_status[c.status] ?? 0) + c.comissao_total;
      linha.comissoes.push(c);
    }
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  }, [comissoes]);

  const totalGeral   = useMemo(() => comissoes.reduce((s, c) => s + c.comissao_total, 0), [comissoes]);
  const totalVendas  = useMemo(() => new Set(comissoes.map((c) => c.venda_id)).size, [comissoes]);

  function exportarCSV() {
    const cabecalho = ["Vendedor", "Tipo", "Competência", "Cliente", "Data Venda", "Comissão Mensal", "Comissão Impl.", "Total", "Status"];
    const linhasCSV = comissoes.map((c) => [
      c.vendedor_nome ?? "",
      c.tipo_beneficiario,
      c.competencia ? labelCompetencia(c.competencia) : "",
      c.venda_cliente ?? "",
      c.venda_data ? formatData(c.venda_data) : "",
      c.comissao_mensal.toFixed(2).replace(".", ","),
      c.comissao_impl.toFixed(2).replace(".", ","),
      c.comissao_total.toFixed(2).replace(".", ","),
      labelStatusComissao(c.status),
    ]);
    const conteudo = [cabecalho, ...linhasCSV].map((r) => r.map((v) => `"${v}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + conteudo], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `comissoes_${filtroInicio}_${filtroFim}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">Relatório de Comissões</h3>
        {carregado && comissoes.length > 0 && (
          <button
            onClick={exportarCSV}
            className="flex items-center gap-1.5 rounded-2xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ↓ Exportar CSV
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">De</label>
          <select
            value={filtroInicio}
            onChange={(e) => setFiltroInicio(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10"
          >
            {opcoesCompetencia.map((c) => (
              <option key={c} value={c}>{labelCompetencia(c)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Até</label>
          <select
            value={filtroFim}
            onChange={(e) => setFiltroFim(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10"
          >
            {opcoesCompetencia.map((c) => (
              <option key={c} value={c}>{labelCompetencia(c)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Vendedor</label>
          <select
            value={filtroVend}
            onChange={(e) => setFiltroVend(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10"
          >
            <option value="">Todos</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Status</label>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as StatusComissao | "")}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10"
          >
            <option value="">Todos</option>
            <option value="aguardando_liberacao">Aguardando Liberação</option>
            <option value="elegivel">Elegível</option>
            <option value="na_competencia">Na Competência</option>
            <option value="aprovada">Aprovada</option>
            <option value="paga">Paga</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>

        <button
          onClick={carregar}
          disabled={carregando}
          className="rounded-2xl bg-folk px-5 py-2.5 text-sm font-semibold text-white hover:bg-folk/90 disabled:opacity-50 transition-colors"
        >
          {carregando ? "Gerando..." : "Gerar"}
        </button>
      </div>

      {/* Pré-carga de vendedores para o filtro */}
      {!carregado && vendedores.length === 0 && (
        <LoadVendedores onLoad={setVendedores} />
      )}

      {erro && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {!carregado && !carregando && (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-12 text-center text-sm text-gray-400">
          Configure os filtros e clique em Gerar para visualizar o relatório.
        </div>
      )}

      {carregado && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KPI label="Total no Período" value={formatMoeda(totalGeral)} destaque />
            <KPI label="Comissões"        value={comissoes.length.toString()} />
            <KPI label="Vendedores"       value={linhas.length.toString()} />
            <KPI label="Vendas"           value={totalVendas.toString()} />
          </div>

          {comissoes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-12 text-center text-sm text-gray-400">
              Nenhuma comissão encontrada para o período selecionado.
            </div>
          ) : (
            <>
              {/* Tabela agrupada por vendedor */}
              <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-100">
                      <th className="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Vendedor</th>
                      <th className="py-3 pr-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Comissões</th>
                      <th className="py-3 pr-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Vendas</th>
                      <th className="py-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Total</th>
                      <th className="py-3 pr-5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500" />
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((l) => (
                      <>
                        <tr
                          key={l.vendedor_id}
                          className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 cursor-pointer"
                          onClick={() => setExpandido(expandido === l.vendedor_id ? null : l.vendedor_id)}
                        >
                          <td className="py-3 pl-5 pr-3">
                            <p className="font-semibold text-gray-800">{l.vendedor_nome}</p>
                            <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${BADGE_TIPO[l.tipo] ?? "bg-gray-100 text-gray-500"}`}>
                              {l.tipo.charAt(0).toUpperCase() + l.tipo.slice(1)}
                            </span>
                          </td>
                          <td className="py-3 pr-3 text-center text-gray-600">{l.qtd}</td>
                          <td className="py-3 pr-3 text-center text-gray-600">
                            {new Set(l.comissoes.map((c) => c.venda_id)).size}
                          </td>
                          <td className="py-3 pr-3 text-right font-bold text-gray-900">{formatMoeda(l.total)}</td>
                          <td className="py-3 pr-5 text-right text-gray-400 text-xs">
                            {expandido === l.vendedor_id ? "▲" : "▼"}
                          </td>
                        </tr>

                        {expandido === l.vendedor_id && (
                          <tr key={`${l.vendedor_id}-detail`} className="bg-gray-50/80">
                            <td colSpan={5} className="px-5 pb-3 pt-1">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    <th className="py-1.5 pr-3 text-left font-semibold text-gray-400">Cliente</th>
                                    <th className="py-1.5 pr-3 text-left font-semibold text-gray-400">Data</th>
                                    <th className="py-1.5 pr-3 text-left font-semibold text-gray-400">Competência</th>
                                    <th className="py-1.5 pr-3 text-right font-semibold text-gray-400">Mensal</th>
                                    <th className="py-1.5 pr-3 text-right font-semibold text-gray-400">Impl.</th>
                                    <th className="py-1.5 pr-3 text-right font-semibold text-gray-400">Total</th>
                                    <th className="py-1.5 text-left font-semibold text-gray-400">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {l.comissoes.map((c) => (
                                    <tr key={c.id} className="border-b border-gray-100 last:border-0">
                                      <td className="py-1.5 pr-3 text-gray-700">{c.venda_cliente ?? "—"}</td>
                                      <td className="py-1.5 pr-3 text-gray-500">{c.venda_data ? formatData(c.venda_data) : "—"}</td>
                                      <td className="py-1.5 pr-3 text-gray-500">{c.competencia ? labelCompetencia(c.competencia) : "—"}</td>
                                      <td className="py-1.5 pr-3 text-right text-gray-700">{formatMoeda(c.comissao_mensal)}</td>
                                      <td className="py-1.5 pr-3 text-right text-gray-700">{formatMoeda(c.comissao_impl)}</td>
                                      <td className="py-1.5 pr-3 text-right font-semibold text-gray-900">{formatMoeda(c.comissao_total)}</td>
                                      <td className="py-1.5">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[c.status] ?? "bg-gray-100 text-gray-500"}`}>
                                          {labelStatusComissao(c.status)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function KPI({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${destaque ? "border-folk/20 bg-folk/5" : "border-gray-200 bg-white"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${destaque ? "text-folk" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}

// Carrega vendedores silenciosamente para popular o filtro antes do primeiro "Gerar"
function LoadVendedores({ onLoad }: { onLoad: (v: Vendedor[]) => void }) {
  useState(() => {
    listarVendedores({ ativo: undefined }).then(onLoad).catch(() => {});
  });
  return null;
}
