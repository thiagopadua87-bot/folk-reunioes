"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import {
  listarFaturas,
  listarAcoesFatura,
  registrarAcao,
  excluirAcao,
  listarTiposAcao,
  importarFaturas,
  atualizarStatusFatura,
  buscarUltimasAcoes,
  STATUS_FATURA,
  type Fatura,
  type InadimplenciaAcao,
  type TipoAcaoCobranca,
  type StatusFatura,
  type LinhaImportacao,
  type ResultadoImportacao,
  type UltimaAcaoFatura,
} from "@/lib/cobranca";

// ── helpers ──────────────────────────────────────────────────────

function formatarMoeda(v: number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("pt-BR");
}

function diasEmAtraso(dataVencimento: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataVencimento + "T00:00:00");
  return Math.floor((hoje.getTime() - venc.getTime()) / 86_400_000);
}

function BadgeAtraso({ dataVencimento, status }: { dataVencimento: string; status: StatusFatura }) {
  const abertas: StatusFatura[] = ["pendente", "em_cobranca", "promessa_pagamento", "negociada", "juridico", "protestada"];
  if (!abertas.includes(status)) return null;

  const dias = diasEmAtraso(dataVencimento);
  if (dias <= 0) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">🟢 A vencer</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
      🔴 {dias} {dias === 1 ? "dia" : "dias"} em atraso
    </span>
  );
}

function ResumoUltimaAcao({ acao }: { acao: UltimaAcaoFatura | undefined }) {
  if (!acao) {
    return <p className="text-xs italic text-gray-400">Nenhuma ação registrada</p>;
  }
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-gray-600">
        <span className="font-semibold text-gray-700">{acao.tipo_acao}</span>
        {" em "}{formatarData(acao.created_at.slice(0, 10))}
      </p>
      {acao.proxima_acao && (
        <p className="text-xs text-folk">
          Promessa / próxima: {acao.proxima_acao}
          {acao.data_proxima_acao ? ` para ${formatarData(acao.data_proxima_acao)}` : ""}
        </p>
      )}
      <p className="text-xs text-gray-400">Por: {acao.usuario_nome}</p>
    </div>
  );
}

function badgeStatus(status: StatusFatura) {
  const s = STATUS_FATURA.find((x) => x.value === status);
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s?.cor ?? "bg-gray-100 text-gray-600"}`}>
      {s?.label ?? status}
    </span>
  );
}

// ── Sub-componente: timeline de ações ────────────────────────────

function TimelineAcoes({
  fatura,
  tiposAcao,
  usuarioId,
  onAcaoRegistrada,
}: {
  fatura: Fatura;
  tiposAcao: TipoAcaoCobranca[];
  usuarioId: string;
  onAcaoRegistrada: () => void;
}) {
  const [acoes, setAcoes]           = useState<InadimplenciaAcao[]>([]);
  const [loadingAcoes, setLoading]  = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [salvando, setSalvando]     = useState(false);
  const [erro, setErro]             = useState("");

  const [form, setForm] = useState({
    tipo_acao: "",
    descricao: "",
    proxima_acao: "",
    data_proxima_acao: "",
    novo_status: "" as StatusFatura | "",
  });

  const carregarAcoes = useCallback(async () => {
    setLoading(true);
    try {
      setAcoes(await listarAcoesFatura(fatura.id));
    } finally {
      setLoading(false);
    }
  }, [fatura.id]);

  useEffect(() => { carregarAcoes(); }, [carregarAcoes]);

  async function handleSalvar() {
    if (!form.tipo_acao) { setErro("Selecione o tipo de ação."); return; }
    setSalvando(true);
    setErro("");
    try {
      await registrarAcao({
        fatura_id: fatura.id,
        usuario_id: usuarioId,
        tipo_acao: form.tipo_acao,
        descricao: form.descricao || undefined,
        proxima_acao: form.proxima_acao || undefined,
        data_proxima_acao: form.data_proxima_acao || undefined,
        novo_status: form.novo_status || undefined,
      });
      setForm({ tipo_acao: "", descricao: "", proxima_acao: "", data_proxima_acao: "", novo_status: "" });
      setMostraForm(false);
      await carregarAcoes();
      onAcaoRegistrada();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluirAcao(id: string) {
    if (!confirm("Excluir esta ação?")) return;
    try {
      await excluirAcao(id);
      await carregarAcoes();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro.");
    }
  }

  return (
    <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
      {!mostraForm && (
        <button
          onClick={() => setMostraForm(true)}
          className="rounded-xl bg-folk px-4 py-2 text-sm font-semibold text-white"
        >
          + Registrar ação
        </button>
      )}

      {mostraForm && (
        <div className="rounded-2xl border border-folk/20 bg-folk/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Nova ação de cobrança</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de ação *</label>
              <select
                value={form.tipo_acao}
                onChange={(e) => setForm((p) => ({ ...p, tipo_acao: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-folk"
              >
                <option value="">Selecione...</option>
                {tiposAcao.filter((t) => t.ativo).map((t) => (
                  <option key={t.id} value={t.nome}>{t.nome}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Alterar status para</label>
              <select
                value={form.novo_status}
                onChange={(e) => setForm((p) => ({ ...p, novo_status: e.target.value as StatusFatura | "" }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-folk"
              >
                <option value="">Manter atual</option>
                {STATUS_FATURA.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Descrição / observação</label>
              <textarea
                value={form.descricao}
                onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-folk"
                placeholder="O que foi dito / acordado..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Próxima ação</label>
              <input
                value={form.proxima_acao}
                onChange={(e) => setForm((p) => ({ ...p, proxima_acao: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-folk"
                placeholder="Ex: Ligar novamente"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data da próxima ação</label>
              <input
                type="date"
                value={form.data_proxima_acao}
                onChange={(e) => setForm((p) => ({ ...p, data_proxima_acao: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-folk"
              />
            </div>
          </div>

          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="rounded-xl bg-folk px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={() => { setMostraForm(false); setErro(""); }}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loadingAcoes ? (
        <p className="text-xs text-gray-400">Carregando histórico...</p>
      ) : acoes.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Nenhuma ação registrada ainda.</p>
      ) : (
        <ul className="space-y-3">
          {acoes.map((a) => (
            <li key={a.id} className="relative flex gap-3">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-folk/50 ring-2 ring-white" />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold text-gray-800">{a.tipo_acao}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {new Date(a.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      {a.usuario_nome ? ` · ${a.usuario_nome}` : ""}
                    </span>
                  </div>
                  <button
                    onClick={() => handleExcluirAcao(a.id)}
                    className="text-xs text-gray-300 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
                {a.descricao && <p className="mt-0.5 text-sm text-gray-600">{a.descricao}</p>}
                {a.proxima_acao && (
                  <p className="mt-1 text-xs text-folk">
                    Próxima: {a.proxima_acao}
                    {a.data_proxima_acao ? ` — ${formatarData(a.data_proxima_acao)}` : ""}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────

export default function FaturasTab() {
  const [faturas, setFaturas]           = useState<Fatura[]>([]);
  const [tiposAcao, setTiposAcao]       = useState<TipoAcaoCobranca[]>([]);
  const [usuarioId, setUsuarioId]       = useState("");
  const [loading, setLoading]           = useState(true);
  const [expandido, setExpandido]       = useState<string | null>(null);
  const [importando, setImportando]     = useState(false);
  const [resultado, setResultado]       = useState<ResultadoImportacao | null>(null);
  const [erro, setErro]                 = useState("");
  const [ultimasAcoes, setUltimasAcoes] = useState<Map<string, UltimaAcaoFatura>>(new Map());

  // Filtros e ordenação
  const [busca, setBusca]               = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusFatura | "">("");
  const [filtroMes, setFiltroMes]       = useState("");
  const [somentAbertas, setSomentAbertas] = useState(true);
  const [ordenacao, setOrdenacao]       = useState<"vencimento" | "cliente" | "valor">("vencimento");

  const fileRef = useRef<HTMLInputElement>(null);

  async function carregar() {
    setLoading(true);
    try {
      const [lista, tipos] = await Promise.all([
        listarFaturas({ busca, status: filtroStatus, mes_referencia: filtroMes || undefined, somente_abertas: somentAbertas }),
        listarTiposAcao(true),
      ]);
      setFaturas(lista);
      setTiposAcao(tipos);

      // Busca últimas ações em lote (1 query para todos os cards)
      if (lista.length > 0) {
        const mapa = await buscarUltimasAcoes(lista.map((f) => f.id));
        setUltimasAcoes(mapa);
      } else {
        setUltimasAcoes(new Map());
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUsuarioId(data.user.id);
    });
  }, []);

  useEffect(() => { carregar(); }, [busca, filtroStatus, filtroMes, somentAbertas]); // eslint-disable-line

  // ── Importação de planilha ──────────────────────────────────────

  function parseExcelDate(val: unknown): string {
    if (typeof val === "number" && val > 0) {
      const d = XLSX.SSF.parse_date_code(val);
      if (!d || !d.y) return "";
      const date = new Date(d.y, d.m - 1, d.d);
      return date.toISOString().slice(0, 10);
    }
    if (typeof val === "string") {
      const partesBarra = val.split("/");
      if (partesBarra.length === 3 && partesBarra.every((p) => /^\d+$/.test(p.trim()))) {
        return `${partesBarra[2].trim().slice(0, 4)}-${partesBarra[1].trim().padStart(2, "0")}-${partesBarra[0].trim().padStart(2, "0")}`;
      }
      if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
        return val.slice(0, 10);
      }
    }
    return "";
  }

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo || !usuarioId) return;

    setImportando(true);
    setErro("");
    setResultado(null);

    try {
      const buffer = await arquivo.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" });

      const linhas: LinhaImportacao[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as unknown[];
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

      if (linhas.length === 0) {
        setErro("Nenhuma linha válida encontrada. Verifique o formato da planilha.");
        return;
      }

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

  const mesesDisponiveis = Array.from(new Set(faturas.map((f) => f.mes_referencia))).sort().reverse();

  const faturaOrdenadas = [...faturas].sort((a, b) => {
    if (ordenacao === "cliente") return a.cliente.localeCompare(b.cliente, "pt-BR");
    if (ordenacao === "valor")   return Number(b.valor) - Number(a.valor);
    return a.data_vencimento.localeCompare(b.data_vencimento); // vencimento ASC
  });

  return (
    <div className="space-y-5">
      {/* Barra de ações */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importando}
          className="flex items-center gap-2 rounded-xl bg-folk px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {importando ? "Importando..." : "⬆ Importar Planilha"}
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleArquivo} />
      </div>

      {/* Resultado da importação */}
      {resultado && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <p className="font-semibold">Importação concluída</p>
          <ul className="mt-1 list-disc list-inside space-y-0.5">
            <li>{resultado.criadas} fatura(s) criada(s)</li>
            <li>{resultado.atualizadas} fatura(s) atualizada(s)</li>
            <li>{resultado.quitadas} fatura(s) marcada(s) como recebida (quitadas)</li>
          </ul>
          {resultado.erros.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-red-600">{resultado.erros.length} erro(s)</summary>
              <ul className="mt-1 list-disc list-inside text-xs text-red-600">
                {resultado.erros.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
          <button onClick={() => setResultado(null)} className="mt-2 text-xs text-green-600 underline">Fechar</button>
        </div>
      )}

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente ou nº nota..."
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-folk"
        />
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as StatusFatura | "")}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-folk"
        >
          <option value="">Todos os status</option>
          {STATUS_FATURA.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-folk"
        >
          <option value="">Todos os meses</option>
          {mesesDisponiveis.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={somentAbertas}
            onChange={(e) => setSomentAbertas(e.target.checked)}
            className="rounded"
          />
          Somente abertas
        </label>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-400">Ordenar por:</span>
          {(["vencimento", "cliente", "valor"] as const).map((op) => (
            <button
              key={op}
              onClick={() => setOrdenacao(op)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                ordenacao === op
                  ? "bg-folk text-white"
                  : "border border-gray-200 text-gray-500 hover:border-folk hover:text-folk"
              }`}
            >
              {op === "vencimento" ? "Vencimento" : op === "cliente" ? "Cliente A-Z" : "Maior valor"}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de faturas */}
      {loading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : faturas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhuma fatura encontrada.</p>
          <p className="text-gray-300 text-xs mt-1">Importe uma planilha para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {faturaOrdenadas.map((fatura) => {
            const aberto    = expandido === fatura.id;
            const ultimaAcao = ultimasAcoes.get(fatura.id);
            return (
              <div
                key={fatura.id}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
              >
                {/* Linha resumo */}
                <button
                  onClick={() => setExpandido(aberto ? null : fatura.id)}
                  className="w-full text-left px-5 py-4"
                >
                  <div className="flex items-start gap-4 flex-wrap">
                    {/* Coluna principal */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-semibold text-gray-900 truncate">{fatura.cliente}</p>
                      <p className="text-xs text-gray-400">
                        NF {fatura.numero_nota} · Venc. {formatarData(fatura.data_vencimento)} · {fatura.mes_referencia}
                      </p>
                      <BadgeAtraso dataVencimento={fatura.data_vencimento} status={fatura.status} />

                      {/* Última ação resumida */}
                      <div className="pt-1 border-t border-gray-50 mt-1">
                        <p className="text-xs font-medium text-gray-400 mb-0.5">Última ação:</p>
                        <ResumoUltimaAcao acao={ultimaAcao} />
                      </div>
                    </div>

                    {/* Coluna direita */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-base font-bold text-gray-800">{formatarMoeda(fatura.valor)}</span>
                      {badgeStatus(fatura.status)}
                      <span className="text-gray-400 text-sm">{aberto ? "▲" : "▼"}</span>
                    </div>
                  </div>
                </button>

                {/* Painel expandido */}
                {aberto && (
                  <div className="px-5 pb-5">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="text-xs font-medium text-gray-500">Alterar status:</span>
                      {STATUS_FATURA.filter((s) => s.value !== fatura.status).map((s) => (
                        <button
                          key={s.value}
                          onClick={async () => {
                            await atualizarStatusFatura(fatura.id, s.value);
                            await carregar();
                          }}
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold border ${s.cor} border-current/20`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    <TimelineAcoes
                      fatura={fatura}
                      tiposAcao={tiposAcao}
                      usuarioId={usuarioId}
                      onAcaoRegistrada={carregar}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
