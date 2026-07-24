"use client";

import { useState, useEffect, useCallback } from "react";
import type { VersaoSolucaoRow, SolucaoOpcao } from "@/lib/engenharia-comercial/versao-dados";
import {
  listarCategoriasDasNecessidades,
  listarTodasSolucoesDisponiveis,
  listarVersaoSolucoes,
  salvarVersaoSolucao,
  removerVersaoSolucao,
} from "@/lib/engenharia-comercial/versao-dados";

const INPUT = "block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-folk focus:ring-2 focus:ring-folk/20";

type CategoriaState = {
  categoria: string;
  opcoes: SolucaoOpcao[];
  solucaoAtual: VersaoSolucaoRow | null;
  salvando: boolean;
  erro: string | null;
};

export function SolucoesEditor({
  versaoId,
  onDadosChanged,
  readOnly = false,
}: {
  versaoId: string;
  onDadosChanged: () => void;
  readOnly?: boolean;
}) {
  const [categorias, setCategorias] = useState<CategoriaState[]>([]);
  const [loading, setLoading]       = useState(true);
  const [semNecessidades, setSemNecessidades] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, solucoes] = await Promise.all([
        listarCategoriasDasNecessidades(versaoId),
        listarVersaoSolucoes(versaoId),
      ]);

      if (cats.length === 0) {
        setSemNecessidades(true);
        setCategorias([]);
        return;
      }
      setSemNecessidades(false);

      // Uma única query carrega soluções de todas as categorias
      const opcoesMapa = await listarTodasSolucoesDisponiveis(cats);

      setCategorias(
        cats.map((cat) => ({
          categoria:    cat,
          opcoes:       opcoesMapa.get(cat) ?? [],
          solucaoAtual: solucoes.find((s) => s.categoria === cat) ?? null,
          salvando:     false,
          erro:         null,
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [versaoId]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function handleSelecionarSolucao(categoria: string, solucaoId: string) {
    setCategorias((prev) =>
      prev.map((c) => c.categoria === categoria ? { ...c, salvando: true, erro: null } : c)
    );
    try {
      if (solucaoId) {
        await salvarVersaoSolucao(versaoId, categoria, solucaoId);
        const opcoes = categorias.find((c) => c.categoria === categoria)?.opcoes ?? [];
        const sol    = opcoes.find((o) => o.id === solucaoId);
        setCategorias((prev) =>
          prev.map((c) =>
            c.categoria === categoria
              ? {
                  ...c,
                  salvando: false,
                  solucaoAtual: sol
                    ? { id: "", versaoId, categoria, solucaoId: sol.id, solucaoNome: sol.nome, solucaoSegmento: sol.segmento }
                    : null,
                }
              : c
          )
        );
      } else {
        await removerVersaoSolucao(versaoId, categoria);
        setCategorias((prev) =>
          prev.map((c) => c.categoria === categoria ? { ...c, salvando: false, solucaoAtual: null } : c)
        );
      }
      onDadosChanged();
    } catch (err) {
      setCategorias((prev) =>
        prev.map((c) =>
          c.categoria === categoria
            ? { ...c, salvando: false, erro: (err as Error).message }
            : c
        )
      );
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />)}
      </div>
    );
  }

  if (semNecessidades) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-amber-200 bg-amber-50 py-12 text-center">
        <p className="text-sm font-semibold text-amber-800">Nenhuma necessidade cadastrada</p>
        <p className="mt-1 text-xs text-amber-700">
          Volte ao passo Escopo e adicione as necessidades do cliente para definir as soluções técnicas.
        </p>
      </div>
    );
  }

  const totalCategorias = categorias.length;
  const totalSelecionadas = categorias.filter((c) => c.solucaoAtual != null).length;

  return (
    <div className="space-y-4">
      {/* Header resumo */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Soluções Técnicas</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Mapeie uma solução para cada categoria de necessidade identificada no escopo.
          </p>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-bold ${totalSelecionadas === totalCategorias ? "text-green-600" : "text-folk"}`}>
            {totalSelecionadas}/{totalCategorias}
          </span>
          <p className="text-xs text-gray-400">soluções</p>
        </div>
      </div>

      {/* Linhas por categoria */}
      {categorias.map((cat) => (
        <div key={cat.categoria} className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                  {cat.categoria}
                </span>
                {cat.solucaoAtual ? (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Solução definida
                  </span>
                ) : (
                  <span className="text-xs text-amber-600">Pendente</span>
                )}
              </div>
              {cat.solucaoAtual && (
                <p className="mt-1.5 text-sm font-medium text-gray-800">
                  {cat.solucaoAtual.solucaoNome}
                  {cat.solucaoAtual.solucaoSegmento && (
                    <span className="ml-1.5 text-xs text-gray-400">· {cat.solucaoAtual.solucaoSegmento}</span>
                  )}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 sm:min-w-[280px]">
              <select
                className={INPUT}
                value={cat.solucaoAtual?.solucaoId ?? ""}
                disabled={cat.salvando || readOnly}
                onChange={(e) => !readOnly && handleSelecionarSolucao(cat.categoria, e.target.value)}
              >
                <option value="">Selecione uma solução...</option>
                {cat.opcoes.length === 0 && (
                  <option disabled value="">Nenhuma solução disponível nesta categoria</option>
                )}
                {cat.opcoes.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}{o.segmento ? ` — ${o.segmento}` : ""}
                  </option>
                ))}
              </select>
              {cat.salvando && <span className="shrink-0 text-xs text-gray-400">Salvando...</span>}
            </div>
          </div>

          {cat.erro && <p className="mt-2 text-xs text-red-600">{cat.erro}</p>}

          {cat.opcoes.length === 0 && (
            <p className="mt-3 text-xs text-amber-600">
              Nenhuma solução ativa cadastrada para a categoria "{cat.categoria}".
              Acesse o catálogo de Soluções para cadastrar uma.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
