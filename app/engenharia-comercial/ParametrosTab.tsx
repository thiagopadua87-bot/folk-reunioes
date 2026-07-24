"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type ParametroFinanceiro,
  listarParametros, editarParametro,
} from "@/lib/engenharia-comercial/catalogo";
import { INPUT, LABEL, FOLK_BTN, GHOST_BTN } from "./components/CrudInfra";

// ── Label de categoria ────────────────────────────────────────

const CATEGORIA_LABELS: Record<string, string> = {
  impostos:     "Impostos",
  margens:      "Margens",
  custos_fixos: "Custos Fixos",
  depreciacoes: "Depreciações",
  riscos:       "Riscos",
  reajustes:    "Reajustes",
  roi:          "ROI",
};

// ── Editor inline por linha ───────────────────────────────────

function LinhaParametro({ param, onSalvo }: { param: ParametroFinanceiro; onSalvo: () => void }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor]       = useState(param.valor);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState<string | null>(null);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await editarParametro(param.id, valor);
      setEditando(false);
      onSalvo();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  function cancelar() {
    setValor(param.valor);
    setErro(null);
    setEditando(false);
  }

  return (
    <tr className="border-b border-gray-100 last:border-0 transition-colors hover:bg-gray-50/50">
      <td className="py-3.5 pl-6 pr-3">
        <p className="text-sm font-medium text-gray-800">{param.descricao}</p>
        <p className="mt-0.5 font-mono text-xs text-gray-400">{param.chave}</p>
      </td>
      <td className="py-3.5 pr-3">
        {editando ? (
          <div className="flex items-center gap-2">
            <div className="w-36">
              <input
                type="number"
                step="0.01"
                className={INPUT}
                value={valor}
                onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
                autoFocus
              />
            </div>
            <span className="text-sm text-gray-500">{param.unidade}</span>
          </div>
        ) : (
          <span className="text-sm font-semibold text-gray-800">
            {param.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            <span className="ml-1 text-xs font-normal text-gray-400">{param.unidade}</span>
          </span>
        )}
        {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
      </td>
      <td className="py-3.5 pr-6 text-right">
        {editando ? (
          <div className="flex justify-end gap-2">
            <button onClick={salvar} disabled={salvando} className={FOLK_BTN}>
              {salvando ? "..." : "Salvar"}
            </button>
            <button onClick={cancelar} className={GHOST_BTN}>Cancelar</button>
          </div>
        ) : (
          <button
            onClick={() => { setValor(param.valor); setEditando(true); }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-folk/30 hover:text-folk"
          >
            Editar
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Tab principal ─────────────────────────────────────────────

export default function ParametrosTab() {
  const [params, setParams]     = useState<ParametroFinanceiro[]>([]);
  const [loading, setLoading]   = useState(true);
  const [erro, setErro]         = useState<string | null>(null);
  const [rev, setRev]           = useState(0);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarParametros({ ativo: true });
      setParams(data);
      setErro(null);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar, rev]);

  const grupos = params.reduce<Record<string, ParametroFinanceiro[]>>((acc, p) => {
    const k = p.categoria;
    (acc[k] ??= []).push(p);
    return acc;
  }, {});

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="h-10 animate-pulse bg-gray-50" />
          {[1, 2, 3].map((j) => <div key={j} className="h-14 animate-pulse border-t border-gray-100 bg-white" />)}
        </div>
      ))}
    </div>
  );

  if (erro) return (
    <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700">{erro}</div>
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Parâmetros financeiros utilizados no motor de precificação. Edite apenas o valor; a chave e a descrição são fixas.
      </p>

      {Object.entries(grupos).map(([categoria, lista]) => (
        <div key={categoria} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-3">
            <h3 className="text-sm font-semibold text-gray-700">{CATEGORIA_LABELS[categoria] ?? categoria}</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-2.5 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Parâmetro</th>
                <th className="py-2.5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Valor</th>
                <th className="py-2.5 pr-6 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Ação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <LinhaParametro key={p.id} param={p} onSalvo={() => setRev((r) => r + 1)} />
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
