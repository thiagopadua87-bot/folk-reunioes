"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import {
  listarVendas, listarPipeline,
  TIPOS_VENDA, STATUS_PIPELINE, TEMPERATURAS,
  labelStatusPipeline, labelTemperatura,
  type Venda, type PipelineItem,
} from "@/lib/comercial";
import {
  listarObras,
  SITUACOES_OBRA, EQUIPES,
  type Obra,
} from "@/lib/projetos";
import {
  listarClientesPerdidos,
  MOTIVOS_PERDA, TIPOS_SERVICO,
  labelMotivoPerda, labelTipoServico,
  type ClientePerdido,
} from "@/lib/operacional";
import { listarVendedores, listarCompetitors, formatarCNPJ } from "@/lib/cadastros";

// ── Tipos ────────────────────────────────────────────────────

type TipoRelatorio = "vendas" | "pipeline" | "obras" | "clientes_perdidos";

type DadosRelatorio =
  | { tipo: "vendas";            rows: Venda[] }
  | { tipo: "pipeline";          rows: PipelineItem[] }
  | { tipo: "obras";             rows: Obra[] }
  | { tipo: "clientes_perdidos"; rows: ClientePerdido[] };

// ── Helpers ──────────────────────────────────────────────────

const INPUT  = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-folk focus:ring-2 focus:ring-folk/10 w-full";
const LABEL  = "text-xs font-semibold uppercase tracking-wide text-gray-500";
const MOEDA  = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const DATA   = (s: string | null) => s ? new Date(s + "T00:00:00").toLocaleDateString("pt-BR") : "—";

// ── Componente ───────────────────────────────────────────────

export default function RelatoriosPanel() {
  const [tipo, setTipo]             = useState<TipoRelatorio>("vendas");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim]       = useState("");

  // Filtros dinâmicos
  const [vendedorId, setVendedorId]         = useState("");
  const [statusPipeline, setStatusPipeline] = useState("");
  const [temperatura, setTemperatura]       = useState("");
  const [situacaoObra, setSituacaoObra]     = useState("");
  const [equipe, setEquipe]                 = useState("");
  const [motivo, setMotivo]                 = useState("");
  const [concorrenteId, setConcorrenteId]   = useState("");

  const [dados, setDados]         = useState<DadosRelatorio | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]           = useState<string | null>(null);

  // Listas para filtros
  const [vendedores, setVendedores]       = useState<{ id: string; nome: string }[]>([]);
  const [concorrentes, setConcorrentes]   = useState<{ id: string; trade_name: string; legal_name: string }[]>([]);
  const [concorrentesMap, setConcorrentesMap] = useState<Map<string, string>>(new Map());

  async function carregarFiltros() {
    const [vends, comps] = await Promise.all([
      listarVendedores({ ativo: true }).catch(() => []),
      listarCompetitors({ status: "ativo" }).catch(() => []),
    ]);
    setVendedores(vends);
    setConcorrentes(comps);
    setConcorrentesMap(new Map(comps.map((c) => [c.id, c.trade_name || c.legal_name])));
  }

  async function gerarRelatorio() {
    setCarregando(true);
    setErro(null);
    setDados(null);
    if (vendedores.length === 0) await carregarFiltros();

    try {
      if (tipo === "vendas") {
        const { registros } = await listarVendas({
          dataInicio: dataInicio || undefined,
          dataFim:    dataFim    || undefined,
          porPagina:  9999,
        });
        const filtrados = registros.filter((r) => {
          if (vendedorId && r.vendedor_id !== vendedorId) return false;
          return true;
        });
        setDados({ tipo: "vendas", rows: filtrados });

      } else if (tipo === "pipeline") {
        const todos = await listarPipeline();
        const filtrados = todos.filter((r) => {
          if (dataInicio && r.data_inicio_lead < dataInicio) return false;
          if (dataFim    && r.data_inicio_lead > dataFim)    return false;
          if (statusPipeline && r.status !== statusPipeline) return false;
          if (temperatura    && r.temperatura !== temperatura) return false;
          if (vendedorId     && r.vendedor_id !== vendedorId) return false;
          return true;
        });
        setDados({ tipo: "pipeline", rows: filtrados });

      } else if (tipo === "obras") {
        const todas = await listarObras();
        const filtradas = todas.filter((r) => {
          if (dataInicio && r.data_inicio < dataInicio) return false;
          if (dataFim    && r.data_inicio > dataFim)    return false;
          if (situacaoObra && r.situacao !== situacaoObra) return false;
          if (equipe       && r.equipe   !== equipe)       return false;
          return true;
        });
        setDados({ tipo: "obras", rows: filtradas });

      } else {
        const registros = await listarClientesPerdidos({
          dataInicio:         dataInicio || undefined,
          dataFim:            dataFim    || undefined,
          motivo:             (motivo as Parameters<typeof listarClientesPerdidos>[0] extends { motivo?: infer M } ? M : never) || undefined,
          winnerCompetitorId: concorrenteId || undefined,
        });
        setDados({ tipo: "clientes_perdidos", rows: registros });
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar relatório.");
    } finally {
      setCarregando(false);
    }
  }

  function exportarExcel() {
    if (!dados) return;
    let linhas: Record<string, string | number>[] = [];

    if (dados.tipo === "vendas") {
      linhas = dados.rows.map((r) => ({
        "Data Fechamento":   DATA(r.data_fechamento),
        "Cliente":           r.cliente,
        "CNPJ":              r.cnpj ? formatarCNPJ(r.cnpj) : "",
        "Vendedor":          r.vendedor_nome ?? "",
        "Tipo de Venda":     TIPOS_VENDA.find((t) => t.value === r.tipo_venda)?.label ?? r.tipo_venda,
        "Serviços":          r.servicos.join(", "),
        "Implantação (R$)":  r.valor_implantacao,
        "Mensal (R$)":       r.valor_mensal,
        "Observações":       r.observacoes,
      }));
    } else if (dados.tipo === "pipeline") {
      linhas = dados.rows.map((r) => ({
        "Data do Lead":      DATA(r.data_inicio_lead),
        "Cliente":           r.cliente,
        "Vendedor":          r.vendedor_nome ?? "",
        "Status":            labelStatusPipeline(r.status),
        "Temperatura":       labelTemperatura(r.temperatura),
        "Implantação (R$)":  r.valor_implantacao,
        "Mensal (R$)":       r.valor_mensal,
        "Indicado por":      r.indicado_por,
        "Observações":       r.observacoes,
      }));
    } else if (dados.tipo === "obras") {
      linhas = dados.rows.map((r) => ({
        "Cliente":               r.cliente,
        "Início":                DATA(r.data_inicio),
        "Início Previsto":       DATA(r.data_inicio_previsto),
        "Prazo":                 DATA(r.data_prazo),
        "Conclusão":             DATA(r.data_conclusao),
        "Situação":              SITUACOES_OBRA.find((s) => s.value === r.situacao)?.label ?? r.situacao,
        "Equipe":                EQUIPES.find((e) => e.value === r.equipe)?.label ?? r.equipe,
        "Técnico":               r.tecnico_nome ?? "",
        "Terceirizado":          r.terceirizado_nome ?? "",
        "Valor de Execução (R$)": r.valor_execucao,
        "Andamento (%)":         r.andamento,
        "Serviços":              r.servicos.join(", "),
      }));
    } else {
      linhas = dados.rows.map((r) => ({
        "Data Aviso":        DATA(r.data_aviso),
        "Data Encerramento": DATA(r.data_encerramento),
        "Cliente":           r.cliente,
        "CNPJ":              r.cnpj ? formatarCNPJ(r.cnpj) : "",
        "Tipo de Serviço":   labelTipoServico(r.tipo_servico),
        "Valor (R$)":        r.valor_contrato,
        "Motivo da Perda":   labelMotivoPerda(r.motivo_perda),
        "Concorrente Vencedor": r.winner_competitor_id ? (concorrentesMap.get(r.winner_competitor_id) ?? "") : "",
        "Observações":       r.observacoes,
      }));
    }

    const ws = XLSX.utils.json_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    const nomes: Record<TipoRelatorio, string> = {
      vendas: "vendas", pipeline: "pipeline", obras: "obras", clientes_perdidos: "clientes_perdidos",
    };
    XLSX.writeFile(wb, `relatorio_${nomes[dados.tipo]}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // ── UI ───────────────────────────────────────────────────────

  const total = dados?.rows.length ?? 0;

  const somaValores: number | null = (() => {
    if (!dados) return null;
    if (dados.tipo === "vendas")            return dados.rows.reduce((s, r) => s + r.valor_mensal, 0);
    if (dados.tipo === "pipeline")          return dados.rows.reduce((s, r) => s + r.valor_mensal, 0);
    if (dados.tipo === "obras")             return dados.rows.reduce((s, r) => s + r.valor_execucao, 0);
    if (dados.tipo === "clientes_perdidos") return dados.rows.reduce((s, r) => s + r.valor_contrato, 0);
    return null;
  })();

  return (
    <div>
      {/* ── Formulário de geração ── */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Tipo */}
          <div className="flex flex-col gap-1.5 lg:col-span-2">
            <label className={LABEL}>Tipo de Relatório</label>
            <select
              value={tipo}
              onChange={(e) => { setTipo(e.target.value as TipoRelatorio); setDados(null); }}
              className={INPUT}
            >
              <option value="vendas">Vendas (Comercial)</option>
              <option value="pipeline">Pipeline</option>
              <option value="obras">Obras (Projetos)</option>
              <option value="clientes_perdidos">Clientes Perdidos</option>
            </select>
          </div>

          {/* Período */}
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Data inicial</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Data final</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className={INPUT} />
          </div>
        </div>

        {/* Filtros dinâmicos */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Vendas + Pipeline → Vendedor */}
          {(tipo === "vendas" || tipo === "pipeline") && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Vendedor</label>
              <select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} className={INPUT}
                onFocus={() => { if (vendedores.length === 0) carregarFiltros(); }}>
                <option value="">Todos</option>
                {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select>
            </div>
          )}

          {/* Pipeline → Status */}
          {tipo === "pipeline" && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Status</label>
              <select value={statusPipeline} onChange={(e) => setStatusPipeline(e.target.value)} className={INPUT}>
                <option value="">Todos</option>
                {STATUS_PIPELINE.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          )}

          {/* Pipeline → Temperatura */}
          {tipo === "pipeline" && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Temperatura</label>
              <select value={temperatura} onChange={(e) => setTemperatura(e.target.value)} className={INPUT}>
                <option value="">Todas</option>
                {TEMPERATURAS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          )}

          {/* Obras → Situação */}
          {tipo === "obras" && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Situação</label>
              <select value={situacaoObra} onChange={(e) => setSituacaoObra(e.target.value)} className={INPUT}>
                <option value="">Todas</option>
                {SITUACOES_OBRA.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          )}

          {/* Obras → Equipe */}
          {tipo === "obras" && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Equipe</label>
              <select value={equipe} onChange={(e) => setEquipe(e.target.value)} className={INPUT}>
                <option value="">Todas</option>
                {EQUIPES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
          )}

          {/* Clientes Perdidos → Motivo */}
          {tipo === "clientes_perdidos" && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Motivo da perda</label>
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={INPUT}>
                <option value="">Todos</option>
                {MOTIVOS_PERDA.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          )}

          {/* Clientes Perdidos → Concorrente */}
          {tipo === "clientes_perdidos" && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Concorrente vencedor</label>
              <select value={concorrenteId} onChange={(e) => setConcorrenteId(e.target.value)} className={INPUT}
                onFocus={() => { if (concorrentes.length === 0) carregarFiltros(); }}>
                <option value="">Todos</option>
                {concorrentes.map((c) => (
                  <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={gerarRelatorio}
            disabled={carregando}
            className="rounded-2xl bg-folk-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {carregando ? "Gerando..." : "Gerar relatório"}
          </button>
          {dados && dados.rows.length > 0 && (
            <button
              onClick={exportarExcel}
              className="rounded-2xl border border-green-200 bg-green-50 px-6 py-2.5 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100"
            >
              Exportar Excel (.xlsx)
            </button>
          )}
        </div>

        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
      </div>

      {/* ── Resultado ── */}
      {dados && (
        <div>
          {/* Resumo */}
          <div className="mb-4 flex flex-wrap items-center gap-6">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{total}</span>{" "}
              registro{total !== 1 ? "s" : ""}
            </p>
            {somaValores !== null && somaValores > 0 && (
              <p className="text-sm text-gray-500">
                {dados.tipo === "clientes_perdidos" ? "Total perdido:" : dados.tipo === "obras" ? "Total execução:" : "MRR total:"}
                {" "}
                <span className="font-semibold text-folk">{MOEDA(somaValores)}</span>
              </p>
            )}
            {dados.tipo === "vendas" && (() => {
              const impl = (dados.rows as Venda[]).reduce((s, r) => s + r.valor_implantacao, 0);
              return impl > 0 ? (
                <p className="text-sm text-gray-500">
                  Implantação total:{" "}
                  <span className="font-semibold text-emerald-600">{MOEDA(impl)}</span>
                </p>
              ) : null;
            })()}
          </div>

          {total === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
              Nenhum registro encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
              {dados.tipo === "vendas" && <TabelaVendas rows={dados.rows} />}
              {dados.tipo === "pipeline" && <TabelaPipeline rows={dados.rows} />}
              {dados.tipo === "obras" && <TabelaObras rows={dados.rows} />}
              {dados.tipo === "clientes_perdidos" && (
                <TabelaClientesPerdidos rows={dados.rows} concorrentesMap={concorrentesMap} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tabelas ──────────────────────────────────────────────────

const TH = "py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 first:pl-6 last:pr-6";
const TD = "py-3.5 px-4 text-sm text-gray-700 first:pl-6 last:pr-6";
const MOEDA_CELL = (v: number) => v > 0 ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v) : "—";

function TabelaVendas({ rows }: { rows: Venda[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50">
          <th className={TH}>Fechamento</th>
          <th className={TH}>Cliente</th>
          <th className={TH}>CNPJ</th>
          <th className={TH}>Vendedor</th>
          <th className={TH}>Tipo</th>
          <th className={TH}>Serviços</th>
          <th className={TH}>Implantação</th>
          <th className={TH}>Mensal</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
            <td className={TD}>{DATA(r.data_fechamento)}</td>
            <td className={`${TD} font-medium text-gray-900`}>{r.cliente}</td>
            <td className={`${TD} text-gray-400`}>{r.cnpj ? formatarCNPJ(r.cnpj) : "—"}</td>
            <td className={TD}>{r.vendedor_nome ?? "—"}</td>
            <td className={TD}>{TIPOS_VENDA.find((t) => t.value === r.tipo_venda)?.label ?? r.tipo_venda}</td>
            <td className={TD}>{r.servicos.join(", ") || "—"}</td>
            <td className={TD}>{MOEDA_CELL(r.valor_implantacao)}</td>
            <td className={TD}>{MOEDA_CELL(r.valor_mensal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TabelaPipeline({ rows }: { rows: PipelineItem[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50">
          <th className={TH}>Data Lead</th>
          <th className={TH}>Cliente</th>
          <th className={TH}>Vendedor</th>
          <th className={TH}>Status</th>
          <th className={TH}>Temperatura</th>
          <th className={TH}>Implantação</th>
          <th className={TH}>Mensal</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
            <td className={TD}>{DATA(r.data_inicio_lead)}</td>
            <td className={`${TD} font-medium text-gray-900`}>{r.cliente}</td>
            <td className={TD}>{r.vendedor_nome ?? "—"}</td>
            <td className={TD}>{labelStatusPipeline(r.status)}</td>
            <td className={TD}>{labelTemperatura(r.temperatura)}</td>
            <td className={TD}>{MOEDA_CELL(r.valor_implantacao)}</td>
            <td className={TD}>{MOEDA_CELL(r.valor_mensal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TabelaObras({ rows }: { rows: Obra[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50">
          <th className={TH}>Cliente</th>
          <th className={TH}>Início</th>
          <th className={TH}>Prazo</th>
          <th className={TH}>Situação</th>
          <th className={TH}>Equipe</th>
          <th className={TH}>Técnico / Terceirizado</th>
          <th className={TH}>Valor Execução</th>
          <th className={TH}>Andamento</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
            <td className={`${TD} font-medium text-gray-900`}>{r.cliente}</td>
            <td className={TD}>{DATA(r.data_inicio_previsto ?? r.data_inicio)}</td>
            <td className={TD}>{DATA(r.data_prazo)}</td>
            <td className={TD}>{SITUACOES_OBRA.find((s) => s.value === r.situacao)?.label ?? r.situacao}</td>
            <td className={TD}>{EQUIPES.find((e) => e.value === r.equipe)?.label ?? r.equipe}</td>
            <td className={TD}>{r.tecnico_nome ?? r.terceirizado_nome ?? "—"}</td>
            <td className={TD}>{MOEDA_CELL(r.valor_execucao)}</td>
            <td className={TD}>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 rounded-full bg-gray-200">
                  <div
                    className="h-1.5 rounded-full bg-folk"
                    style={{ width: `${r.andamento}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{r.andamento}%</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TabelaClientesPerdidos({
  rows, concorrentesMap,
}: { rows: ClientePerdido[]; concorrentesMap: Map<string, string> }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50">
          <th className={TH}>Aviso</th>
          <th className={TH}>Encerramento</th>
          <th className={TH}>Cliente</th>
          <th className={TH}>CNPJ</th>
          <th className={TH}>Tipo de Serviço</th>
          <th className={TH}>Valor</th>
          <th className={TH}>Motivo</th>
          <th className={TH}>Concorrente</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
            <td className={TD}>{DATA(r.data_aviso)}</td>
            <td className={TD}>{DATA(r.data_encerramento)}</td>
            <td className={`${TD} font-medium text-gray-900`}>{r.cliente}</td>
            <td className={`${TD} text-gray-400`}>{r.cnpj ? formatarCNPJ(r.cnpj) : "—"}</td>
            <td className={TD}>{labelTipoServico(r.tipo_servico)}</td>
            <td className={TD}>{MOEDA_CELL(r.valor_contrato)}</td>
            <td className={TD}>{labelMotivoPerda(r.motivo_perda)}</td>
            <td className={TD}>
              {r.winner_competitor_id ? (concorrentesMap.get(r.winner_competitor_id) ?? "—") : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
