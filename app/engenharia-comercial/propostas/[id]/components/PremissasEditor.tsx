"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { PremissaRow, PremissaUpsert } from "@/lib/engenharia-comercial/versao-dados";
import {
  listarPremissas, upsertPremissa, excluirPremissa, seedPremissasPadrao,
  PREMISSAS_PADRAO,
} from "@/lib/engenharia-comercial/versao-dados";

const INPUT = "block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-folk focus:ring-2 focus:ring-folk/20";
const FOLK_BTN  = "rounded-xl bg-folk-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50";
const GHOST_BTN = "rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50";

const CATEGORIAS: { id: PremissaRow["categoria"]; label: string }[] = [
  { id: "video",           label: "Vídeo" },
  { id: "rede",            label: "Rede" },
  { id: "disponibilidade", label: "Disponibilidade" },
  { id: "capacidade",      label: "Capacidade" },
  { id: "energia",         label: "Energia" },
  { id: "acesso",          label: "Acesso" },
  { id: "geral",           label: "Geral" },
];

type NovaPremissa = {
  categoria: PremissaRow["categoria"];
  chave: string;
  valorNumerico: string;
  valorTexto: string;
  unidade: string;
  descricao: string;
};
const EMPTY_NOVA: NovaPremissa = {
  categoria: "geral",
  chave: "",
  valorNumerico: "",
  valorTexto: "",
  unidade: "",
  descricao: "",
};

export function PremissasEditor({
  versaoId,
  onDadosChanged,
  readOnly = false,
}: {
  versaoId: string;
  onDadosChanged: () => void;
  readOnly?: boolean;
}) {
  const [rows, setRows]           = useState<PremissaRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [seedando, setSeedando]   = useState(false);
  const [nova, setNova]           = useState<NovaPremissa>(EMPTY_NOVA);
  const [adicionando, setAdicionando] = useState(false);
  const [erroNova, setErroNova]   = useState<string | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<string, "saving" | "saved" | "error">>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const carregar = useCallback(async () => {
    try {
      setRows(await listarPremissas(versaoId));
    } finally {
      setLoading(false);
    }
  }, [versaoId]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout); }, []);

  function scheduleRowSave(id: string, updated: PremissaRow) {
    clearTimeout(timers.current[id]);
    setRowStatus((s) => ({ ...s, [id]: "saving" }));
    timers.current[id] = setTimeout(async () => {
      try {
        await upsertPremissa(versaoId, {
          id:            updated.id,
          versaoId,
          categoria:     updated.categoria,
          chave:         updated.chave,
          valorNumerico: updated.valorNumerico,
          valorTexto:    updated.valorTexto,
          unidade:       updated.unidade,
          descricao:     updated.descricao,
          impacto:       updated.impacto,
          ordem:         updated.ordem,
        });
        setRowStatus((s) => ({ ...s, [id]: "saved" }));
        onDadosChanged();
        setTimeout(() => setRowStatus((s) => { const n = { ...s }; delete n[id]; return n; }), 2000);
      } catch {
        setRowStatus((s) => ({ ...s, [id]: "error" }));
      }
    }, 800);
  }

  function updateRow(id: string, key: keyof PremissaRow, value: unknown) {
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
      await excluirPremissa(id);
      onDadosChanged();
    } catch {
      void carregar();
    }
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nova.chave.trim()) { setErroNova("Informe a chave."); return; }
    setAdicionando(true); setErroNova(null);
    try {
      const payload: PremissaUpsert = {
        versaoId,
        categoria:     nova.categoria,
        chave:         nova.chave.trim().toLowerCase().replace(/\s+/g, "_"),
        valorNumerico: nova.valorNumerico ? parseFloat(nova.valorNumerico) : null,
        valorTexto:    nova.valorTexto.trim(),
        unidade:       nova.unidade.trim(),
        descricao:     nova.descricao.trim(),
        impacto:       "",
        ordem:         rows.length + 1,
      };
      await upsertPremissa(versaoId, payload);
      await carregar();
      setNova(EMPTY_NOVA);
      onDadosChanged();
    } catch (err) {
      setErroNova((err as Error).message);
    } finally {
      setAdicionando(false);
    }
  }

  async function seed() {
    setSeedando(true);
    try {
      await seedPremissasPadrao(versaoId);
      await carregar();
      onDadosChanged();
    } catch (err) {
      console.error(err);
    } finally {
      setSeedando(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />)}
      </div>
    );
  }

  const porCategoria = CATEGORIAS.map((cat) => ({
    ...cat,
    rows: rows.filter((r) => r.categoria === cat.id),
  })).filter((c) => c.rows.length > 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Premissas de Engenharia</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Parâmetros técnicos usados no cálculo. Edite inline — as alterações são salvas automaticamente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{rows.length} premissas</span>
          {!readOnly && rows.length === 0 && (
            <button onClick={seed} disabled={seedando} className={FOLK_BTN}>
              {seedando ? "Carregando..." : "Carregar padrões"}
            </button>
          )}
          {!readOnly && rows.length > 0 && rows.length < PREMISSAS_PADRAO.length && (
            <button onClick={seed} disabled={seedando} className={GHOST_BTN}>
              {seedando ? "..." : "+ Adicionar padrões"}
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 py-12 text-center">
          <p className="text-sm font-semibold text-gray-500">Nenhuma premissa cadastrada</p>
          <p className="mt-1 text-xs text-gray-400">
            Carregue os valores padrão ou adicione manualmente abaixo.
          </p>
        </div>
      ) : (
        porCategoria.map((cat) => (
          <div key={cat.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{cat.label}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="py-2 pl-5 pr-3 text-left w-44">Chave</th>
                  <th className="py-2 pr-3 text-right w-28">Valor num.</th>
                  <th className="py-2 pr-3 text-left w-24">Texto</th>
                  <th className="py-2 pr-3 text-left w-20">Unidade</th>
                  <th className="py-2 pr-3 text-left">Descrição</th>
                  <th className="py-2 pr-5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {cat.rows.map((r) => {
                  const st = rowStatus[r.id];
                  return (
                    <tr key={r.id} className="group border-b border-gray-100 last:border-0">
                      <td className="py-1.5 pl-5 pr-3">
                        <span className="font-mono text-xs text-gray-600">{r.chave}</span>
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          type="number"
                          className={`${INPUT} !py-1.5 !text-xs text-right`}
                          value={r.valorNumerico ?? ""}
                          placeholder="—"
                          disabled={readOnly}
                          onChange={(e) => updateRow(r.id, "valorNumerico", e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          className={`${INPUT} !py-1.5 !text-xs`}
                          value={r.valorTexto}
                          placeholder="—"
                          disabled={readOnly}
                          onChange={(e) => updateRow(r.id, "valorTexto", e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          className={`${INPUT} !py-1.5 !text-xs`}
                          value={r.unidade}
                          disabled={readOnly}
                          onChange={(e) => updateRow(r.id, "unidade", e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input
                          className={`${INPUT} !py-1.5 !text-xs`}
                          value={r.descricao}
                          disabled={readOnly}
                          onChange={(e) => updateRow(r.id, "descricao", e.target.value)}
                        />
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
        ))
      )}

      {/* Formulário de adição */}
      {!readOnly && <form onSubmit={adicionar} className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-5 py-4">
        <p className="mb-2.5 text-xs font-semibold text-gray-500">Adicionar premissa personalizada</p>
        <div className="flex flex-wrap gap-2">
          <select className={`${INPUT} w-36`} value={nova.categoria}
            onChange={(e) => setNova({ ...nova, categoria: e.target.value as PremissaRow["categoria"] })}>
            {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input className={`${INPUT} w-40`} placeholder="chave_da_premissa *"
            value={nova.chave} onChange={(e) => setNova({ ...nova, chave: e.target.value })} />
          <input type="number" className={`${INPUT} w-24 text-right`} placeholder="Num."
            value={nova.valorNumerico} onChange={(e) => setNova({ ...nova, valorNumerico: e.target.value })} />
          <input className={`${INPUT} w-24`} placeholder="Texto"
            value={nova.valorTexto} onChange={(e) => setNova({ ...nova, valorTexto: e.target.value })} />
          <input className={`${INPUT} w-20`} placeholder="Unidade"
            value={nova.unidade} onChange={(e) => setNova({ ...nova, unidade: e.target.value })} />
          <input className={`${INPUT} min-w-[160px] flex-1`} placeholder="Descrição"
            value={nova.descricao} onChange={(e) => setNova({ ...nova, descricao: e.target.value })} />
          <button type="submit" disabled={adicionando} className={FOLK_BTN}>
            {adicionando ? "..." : "+ Adicionar"}
          </button>
        </div>
        {erroNova && <p className="mt-2 text-xs text-red-600">{erroNova}</p>}
      </form>}
    </div>
  );
}
