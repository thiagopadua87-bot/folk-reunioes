"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { CustoRow, CustoPayload } from "@/lib/engenharia-comercial/versao-dados";
import { listarCustos, criarCusto, editarCusto, excluirCusto } from "@/lib/engenharia-comercial/versao-dados";

const INPUT = "block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-folk focus:ring-2 focus:ring-folk/20";
const FOLK_BTN = "rounded-xl bg-folk-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50";

const CATEGORIAS_CUSTO = [
  { value: "frete",              label: "Frete" },
  { value: "hospedagem",         label: "Hospedagem" },
  { value: "deslocamento",       label: "Deslocamento" },
  { value: "cloud",              label: "Cloud / Hosting" },
  { value: "monitoramento",      label: "Monitoramento" },
  { value: "mao_de_obra",        label: "Mão de obra" },
  { value: "telefonia",          label: "Telefonia" },
  { value: "treinamento",        label: "Treinamento" },
  { value: "garantia_estendida", label: "Garantia Estendida" },
  { value: "outros",             label: "Outros" },
];

const TIPOS_CUSTO = [
  { value: "unico",  label: "Único" },
  { value: "mensal", label: "Mensal" },
  { value: "anual",  label: "Anual" },
];

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

type NovoCusto = { categoria: string; descricao: string; tipoCusto: string; valor: string; observacoes: string };
const EMPTY_NOVO: NovoCusto = { categoria: "outros", descricao: "", tipoCusto: "unico", valor: "", observacoes: "" };

export function CustosEditor({
  versaoId,
  onDadosChanged,
  readOnly = false,
}: {
  versaoId: string;
  onDadosChanged: () => void;
  readOnly?: boolean;
}) {
  const [rows, setRows]           = useState<CustoRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [novo, setNovo]           = useState<NovoCusto>(EMPTY_NOVO);
  const [adicionando, setAdicionando] = useState(false);
  const [erroNovo, setErroNovo]   = useState<string | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<string, "saving" | "saved" | "error">>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const carregar = useCallback(async () => {
    try {
      setRows(await listarCustos(versaoId));
    } finally {
      setLoading(false);
    }
  }, [versaoId]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout); }, []);

  function scheduleRowSave(id: string, updated: CustoRow) {
    clearTimeout(timers.current[id]);
    setRowStatus((s) => ({ ...s, [id]: "saving" }));
    timers.current[id] = setTimeout(async () => {
      try {
        await editarCusto(id, {
          categoria:   updated.categoria,
          descricao:   updated.descricao,
          tipoCusto:   updated.tipoCusto,
          valor:       updated.valor,
          observacoes: updated.observacoes,
        });
        setRowStatus((s) => ({ ...s, [id]: "saved" }));
        onDadosChanged();
        setTimeout(() => setRowStatus((s) => { const n = { ...s }; delete n[id]; return n; }), 2000);
      } catch {
        setRowStatus((s) => ({ ...s, [id]: "error" }));
      }
    }, 800);
  }

  function updateRow(id: string, key: keyof CustoRow, value: unknown) {
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
      await excluirCusto(id);
      onDadosChanged();
    } catch {
      void carregar();
    }
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!novo.descricao.trim()) { setErroNovo("Informe a descrição."); return; }
    const valorNum = parseFloat(novo.valor);
    if (!valorNum || valorNum <= 0) { setErroNovo("Informe um valor válido."); return; }
    setAdicionando(true); setErroNovo(null);
    try {
      const payload: CustoPayload = {
        versaoId,
        categoria:    novo.categoria,
        descricao:    novo.descricao.trim(),
        tipoCusto:    novo.tipoCusto as CustoRow["tipoCusto"],
        valor:        valorNum,
        fornecedorId: null,
        observacoes:  novo.observacoes.trim(),
        ordem:        rows.length,
      };
      const row = await criarCusto(payload);
      setRows((prev) => [...prev, row]);
      setNovo(EMPTY_NOVO);
      onDadosChanged();
    } catch (err) {
      setErroNovo((err as Error).message);
    } finally {
      setAdicionando(false);
    }
  }

  if (loading) return <div className="h-48 animate-pulse rounded-xl bg-gray-100" />;

  // Subtotais
  const totalUnico  = rows.filter((r) => r.tipoCusto === "unico").reduce((s, r) => s + r.valor, 0);
  const totalMensal = rows.filter((r) => r.tipoCusto === "mensal").reduce((s, r) => s + r.valor, 0);
  const totalAnual  = rows.filter((r) => r.tipoCusto === "anual").reduce((s, r) => s + r.valor, 0);

  return (
    <div className="space-y-4">
      {/* Tabela de custos */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Custos Adicionais</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Custos fora do catálogo: frete, deslocamento, mão de obra, serviços, etc.
            </p>
          </div>
          <span className="text-xs text-gray-400">{rows.length} {rows.length === 1 ? "custo" : "custos"}</span>
        </div>

        {rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            Nenhum custo adicional. Este campo é opcional.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="py-2.5 pl-5 pr-3 text-left w-40">Categoria</th>
                  <th className="py-2.5 pr-3 text-left">Descrição</th>
                  <th className="py-2.5 pr-3 text-left w-28">Tipo</th>
                  <th className="py-2.5 pr-3 text-right w-32">Valor (R$)</th>
                  <th className="py-2.5 pr-3 text-left">Observações</th>
                  <th className="py-2.5 pr-5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = rowStatus[r.id];
                  return (
                    <tr key={r.id} className="group border-b border-gray-100 last:border-0">
                      <td className="py-1.5 pl-5 pr-3">
                        <select className={`${INPUT} !py-1.5 !text-xs`} value={r.categoria} disabled={readOnly}
                          onChange={(e) => updateRow(r.id, "categoria", e.target.value)}>
                          {CATEGORIAS_CUSTO.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 pr-3">
                        <input className={`${INPUT} !py-1.5 !text-xs`} value={r.descricao} disabled={readOnly}
                          onChange={(e) => updateRow(r.id, "descricao", e.target.value)} />
                      </td>
                      <td className="py-1.5 pr-3">
                        <select className={`${INPUT} !py-1.5 !text-xs`} value={r.tipoCusto} disabled={readOnly}
                          onChange={(e) => updateRow(r.id, "tipoCusto", e.target.value)}>
                          {TIPOS_CUSTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 pr-3">
                        <input type="number" min="0" step="0.01" className={`${INPUT} !py-1.5 !text-xs text-right`}
                          value={r.valor} disabled={readOnly}
                          onChange={(e) => updateRow(r.id, "valor", parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="py-1.5 pr-3">
                        <input className={`${INPUT} !py-1.5 !text-xs`} value={r.observacoes} disabled={readOnly}
                          onChange={(e) => updateRow(r.id, "observacoes", e.target.value)} />
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
          <p className="mb-2.5 text-xs font-semibold text-gray-500">Adicionar custo</p>
          <div className="flex flex-wrap gap-2">
            <select className={`${INPUT} w-40`} value={novo.categoria}
              onChange={(e) => setNovo({ ...novo, categoria: e.target.value })}>
              {CATEGORIAS_CUSTO.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input className={`${INPUT} min-w-[160px] flex-1`} placeholder="Descrição *"
              value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} />
            <select className={`${INPUT} w-28`} value={novo.tipoCusto}
              onChange={(e) => setNovo({ ...novo, tipoCusto: e.target.value })}>
              {TIPOS_CUSTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input type="number" min="0" step="0.01" className={`${INPUT} w-32 text-right`} placeholder="Valor *"
              value={novo.valor} onChange={(e) => setNovo({ ...novo, valor: e.target.value })} />
            <input className={`${INPUT} w-36`} placeholder="Obs."
              value={novo.observacoes} onChange={(e) => setNovo({ ...novo, observacoes: e.target.value })} />
            <button type="submit" disabled={adicionando} className={FOLK_BTN}>
              {adicionando ? "..." : "+ Adicionar"}
            </button>
          </div>
          {erroNovo && <p className="mt-2 text-xs text-red-600">{erroNovo}</p>}
        </form>}
      </div>

      {/* Subtotais */}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Custos únicos",  valor: totalUnico,  cor: "text-gray-800" },
            { label: "Custos mensais", valor: totalMensal, cor: "text-blue-700" },
            { label: "Custos anuais",  valor: totalAnual,  cor: "text-purple-700" },
          ].map(({ label, valor, cor }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white px-5 py-4">
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`mt-1 text-xl font-bold ${cor}`}>{brl(valor)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
