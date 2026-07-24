"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ProjetoDadosForm, NecessidadeRow } from "@/lib/engenharia-comercial/versao-dados";
import {
  buscarProjetoDados, salvarProjetoDados,
  listarNecessidades, criarNecessidade, editarNecessidade, excluirNecessidade,
} from "@/lib/engenharia-comercial/versao-dados";
import { useAutoSave, AutoSaveIndicator } from "./AutoSaveIndicator";

// ── Estilos ───────────────────────────────────────────────────

const INPUT = "block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-folk focus:ring-2 focus:ring-folk/20";
const FOLK_BTN = "rounded-xl bg-folk-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50";
const LABEL    = "text-xs font-semibold uppercase tracking-wide text-gray-500";

const TIPO_OPTS = [
  { value: "",           label: "Não informado" },
  { value: "vertical",   label: "Vertical" },
  { value: "horizontal", label: "Horizontal" },
  { value: "misto",      label: "Misto" },
  { value: "comercial",  label: "Comercial" },
  { value: "industrial", label: "Industrial" },
  { value: "outro",      label: "Outro" },
];

// ── Formulário: Dados do Projeto ──────────────────────────────

function ProjetoDadosSection({
  versaoId,
  onDadosChanged,
  readOnly = false,
}: {
  versaoId: string;
  onDadosChanged: () => void;
  readOnly?: boolean;
}) {
  const [dados, setDados] = useState<ProjetoDadosForm>({
    versaoId,
    tipoCondominio: "",
    numeroUnidades: 0,
    numeroPortarias: 0,
    numeroAcessos: 0,
    numeroElevadores: 0,
    areaTotal: 0,
    observacoes: "",
  });
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    buscarProjetoDados(versaoId)
      .then((d) => { if (d) setDados(d); })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, [versaoId]);

  const { schedule, status } = useAutoSave(salvarProjetoDados, onDadosChanged);

  function update<K extends keyof ProjetoDadosForm>(key: K, value: ProjetoDadosForm[K]) {
    const next = { ...dados, [key]: value };
    setDados(next);
    if (!readOnly) schedule(next);
  }

  if (carregando) return <div className="h-52 animate-pulse rounded-xl bg-gray-100" />;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Dados do Projeto</h3>
        {!readOnly && <AutoSaveIndicator status={status} />}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1.5 lg:col-span-1">
          <label className={LABEL}>Tipo de condomínio</label>
          <select className={INPUT} value={dados.tipoCondominio} disabled={readOnly}
            onChange={(e) => update("tipoCondominio", e.target.value)}>
            {TIPO_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={LABEL}>Nº de unidades</label>
          <input type="number" min="0" className={INPUT} value={dados.numeroUnidades || ""} disabled={readOnly}
            onChange={(e) => update("numeroUnidades", parseInt(e.target.value) || 0)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={LABEL}>Área total (m²)</label>
          <input type="number" min="0" step="0.01" className={INPUT} value={dados.areaTotal || ""} disabled={readOnly}
            onChange={(e) => update("areaTotal", parseFloat(e.target.value) || 0)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={LABEL}>Nº de portarias</label>
          <input type="number" min="0" className={INPUT} value={dados.numeroPortarias || ""} disabled={readOnly}
            onChange={(e) => update("numeroPortarias", parseInt(e.target.value) || 0)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={LABEL}>Nº de acessos</label>
          <input type="number" min="0" className={INPUT} value={dados.numeroAcessos || ""} disabled={readOnly}
            onChange={(e) => update("numeroAcessos", parseInt(e.target.value) || 0)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={LABEL}>Nº de elevadores</label>
          <input type="number" min="0" className={INPUT} value={dados.numeroElevadores || ""} disabled={readOnly}
            onChange={(e) => update("numeroElevadores", parseInt(e.target.value) || 0)} />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
          <label className={LABEL}>
            Observações <span className="font-normal normal-case text-gray-400">(opcional)</span>
          </label>
          <textarea rows={2} className={`${INPUT} resize-none`} value={dados.observacoes} disabled={readOnly}
            onChange={(e) => update("observacoes", e.target.value)}
            placeholder="Restrições, particularidades, detalhes da instalação..." />
        </div>
      </div>
    </div>
  );
}

// ── CRUD inline: Necessidades ─────────────────────────────────

type NovaNecessidade = { categoria: string; item: string; quantidade: string; unidade: string; observacao: string };
const EMPTY_NOVA: NovaNecessidade = { categoria: "", item: "", quantidade: "1", unidade: "un", observacao: "" };

function NecessidadesSection({
  versaoId,
  onDadosChanged,
  readOnly = false,
}: {
  versaoId: string;
  onDadosChanged: () => void;
  readOnly?: boolean;
}) {
  const [rows, setRows]       = useState<NecessidadeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [nova, setNova]       = useState<NovaNecessidade>(EMPTY_NOVA);
  const [adicionando, setAdicionando] = useState(false);
  const [erroNova, setErroNova]       = useState<string | null>(null);
  const [rowStatus, setRowStatus]     = useState<Record<string, "saving" | "saved" | "error">>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const carregar = useCallback(async () => {
    try {
      setRows(await listarNecessidades(versaoId));
    } finally {
      setLoading(false);
    }
  }, [versaoId]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout); }, []);

  function scheduleRowSave(id: string, updated: NecessidadeRow) {
    clearTimeout(timers.current[id]);
    setRowStatus((s) => ({ ...s, [id]: "saving" }));
    timers.current[id] = setTimeout(async () => {
      try {
        await editarNecessidade(id, {
          categoria:  updated.categoria,
          item:       updated.item,
          quantidade: updated.quantidade,
          unidade:    updated.unidade,
          observacao: updated.observacao,
        });
        setRowStatus((s) => ({ ...s, [id]: "saved" }));
        onDadosChanged();
        setTimeout(() => setRowStatus((s) => { const n = { ...s }; delete n[id]; return n; }), 2000);
      } catch {
        setRowStatus((s) => ({ ...s, [id]: "error" }));
      }
    }, 800);
  }

  function updateRow(id: string, key: keyof NecessidadeRow, value: string | number) {
    setRows((prev) => {
      const next = prev.map((r) => r.id === id ? { ...r, [key]: value } : r);
      const updated = next.find((r) => r.id === id);
      if (updated && !readOnly) scheduleRowSave(id, updated);
      return next;
    });
  }

  async function excluir(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    try {
      await excluirNecessidade(id);
      onDadosChanged();
    } catch {
      void carregar();
    }
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nova.categoria.trim()) { setErroNova("Informe a categoria."); return; }
    if (!nova.item.trim())      { setErroNova("Informe o item."); return; }
    setAdicionando(true); setErroNova(null);
    try {
      const row = await criarNecessidade({
        versaoId,
        categoria:  nova.categoria.trim(),
        item:       nova.item.trim(),
        quantidade: parseFloat(nova.quantidade) || 1,
        unidade:    nova.unidade.trim() || "un",
        observacao: nova.observacao.trim(),
        ordem:      rows.length,
      });
      setRows((prev) => [...prev, row]);
      setNova(EMPTY_NOVA);
      onDadosChanged();
    } catch (err) {
      setErroNova((err as Error).message);
    } finally {
      setAdicionando(false);
    }
  }

  if (loading) return <div className="h-40 animate-pulse rounded-xl bg-gray-100" />;

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-800">Necessidades do Cliente</h3>
        <span className="text-xs text-gray-400">
          {rows.length} {rows.length === 1 ? "item" : "itens"}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          Nenhuma necessidade cadastrada ainda. Use o formulário abaixo para adicionar.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-2.5 pl-5 pr-3 text-left w-32">Categoria</th>
                <th className="py-2.5 pr-3 text-left">Item / Especificação</th>
                <th className="py-2.5 pr-3 text-right w-20">Qtd</th>
                <th className="py-2.5 pr-3 text-left w-16">Un</th>
                <th className="py-2.5 pr-3 text-left">Observação</th>
                <th className="py-2.5 pr-5 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = rowStatus[r.id];
                return (
                  <tr key={r.id} className="group border-b border-gray-100 last:border-0">
                    <td className="py-1.5 pl-5 pr-3">
                      <input className={`${INPUT} !py-1.5 !text-xs`} value={r.categoria} disabled={readOnly}
                        onChange={(e) => updateRow(r.id, "categoria", e.target.value)} />
                    </td>
                    <td className="py-1.5 pr-3">
                      <input className={`${INPUT} !py-1.5 !text-xs`} value={r.item} disabled={readOnly}
                        onChange={(e) => updateRow(r.id, "item", e.target.value)} />
                    </td>
                    <td className="py-1.5 pr-3">
                      <input type="number" min="0" className={`${INPUT} !py-1.5 !text-xs text-right`}
                        value={r.quantidade} disabled={readOnly}
                        onChange={(e) => updateRow(r.id, "quantidade", parseFloat(e.target.value) || 0)} />
                    </td>
                    <td className="py-1.5 pr-3">
                      <input className={`${INPUT} !py-1.5 !text-xs`} value={r.unidade} disabled={readOnly}
                        onChange={(e) => updateRow(r.id, "unidade", e.target.value)} />
                    </td>
                    <td className="py-1.5 pr-3">
                      <input className={`${INPUT} !py-1.5 !text-xs`} value={r.observacao} disabled={readOnly}
                        onChange={(e) => updateRow(r.id, "observacao", e.target.value)} />
                    </td>
                    <td className="py-1.5 pr-5">
                      {!readOnly && (
                        <div className="flex items-center gap-1">
                          {st === "saving" && <span className="text-[9px] text-gray-400">•••</span>}
                          {st === "saved"  && <span className="text-[9px] text-green-500">✓</span>}
                          {st === "error"  && <span className="text-[9px] text-red-500">✗</span>}
                          <button
                            onClick={() => excluir(r.id)}
                            className="rounded-lg p-1 text-gray-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                            title="Remover"
                          >
                            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                              <path d="M3 4h10M6 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M5 4l.5 9h5L11 4" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Formulário de adição */}
      {!readOnly && <form onSubmit={adicionar} className="border-t border-dashed border-gray-200 bg-gray-50/60 px-5 py-4">
        <p className="mb-2.5 text-xs font-semibold text-gray-500">Adicionar necessidade</p>
        <div className="flex flex-wrap gap-2">
          <input className={`${INPUT} w-32`} placeholder="Categoria *"
            value={nova.categoria} onChange={(e) => setNova({ ...nova, categoria: e.target.value })} />
          <input className={`${INPUT} min-w-[160px] flex-1`} placeholder="Item / Especificação *"
            value={nova.item} onChange={(e) => setNova({ ...nova, item: e.target.value })} />
          <input type="number" min="0" className={`${INPUT} w-20 text-right`} placeholder="Qtd"
            value={nova.quantidade} onChange={(e) => setNova({ ...nova, quantidade: e.target.value })} />
          <input className={`${INPUT} w-16`} placeholder="Un"
            value={nova.unidade} onChange={(e) => setNova({ ...nova, unidade: e.target.value })} />
          <input className={`${INPUT} w-36`} placeholder="Obs."
            value={nova.observacao} onChange={(e) => setNova({ ...nova, observacao: e.target.value })} />
          <button type="submit" disabled={adicionando} className={FOLK_BTN}>
            {adicionando ? "..." : "+ Adicionar"}
          </button>
        </div>
        {erroNova && <p className="mt-2 text-xs text-red-600">{erroNova}</p>}
      </form>}
    </div>
  );
}

// ── Export principal ──────────────────────────────────────────

export function EscopoEditor({
  versaoId,
  onDadosChanged,
  readOnly = false,
}: {
  versaoId: string;
  onDadosChanged: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-4">
      <ProjetoDadosSection versaoId={versaoId} onDadosChanged={onDadosChanged} readOnly={readOnly} />
      <NecessidadesSection versaoId={versaoId} onDadosChanged={onDadosChanged} readOnly={readOnly} />
    </div>
  );
}
