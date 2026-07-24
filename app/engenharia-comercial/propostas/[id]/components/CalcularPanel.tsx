"use client";

import { useState, useEffect } from "react";
import { calcularEngenharia } from "@/lib/engenharia-comercial/propostas-mutations";
import { validarVersaoParaCalculo } from "@/lib/engenharia-comercial/validacao";
import type { ResultadoValidacao, ValidacaoSecao } from "@/lib/engenharia-comercial/validacao";

const SECAO_LABEL: Record<ValidacaoSecao, string> = {
  escopo:    "Escopo",
  solucoes:  "Soluções",
  premissas: "Premissas",
  custos:    "Custos",
};

export function CalcularPanel({
  versaoId,
  onCalculado,
  onNavigate,
}: {
  versaoId:    string;
  onCalculado: () => void;
  onNavigate:  (s: string) => void;
}) {
  const [validacao, setValidacao]   = useState<ResultadoValidacao | null>(null);
  const [validando, setValidando]   = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [erroCalculo, setErroCalculo] = useState<string | null>(null);

  useEffect(() => {
    setValidando(true);
    validarVersaoParaCalculo(versaoId)
      .then(setValidacao)
      .catch(() => setValidacao(null))
      .finally(() => setValidando(false));
  }, [versaoId]);

  async function calcular() {
    setCalculando(true); setErroCalculo(null);
    try {
      await calcularEngenharia(versaoId);
      onCalculado();
    } catch (e) {
      setErroCalculo((e as Error).message ?? "Erro desconhecido durante o cálculo.");
      // Re-valida para mostrar quais erros persistem
      const r = await validarVersaoParaCalculo(versaoId).catch(() => null);
      if (r) setValidacao(r);
    } finally {
      setCalculando(false);
    }
  }

  if (validando) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />)}
      </div>
    );
  }

  const bloqueantes = validacao?.bloqueantes ?? [];
  const avisos      = validacao?.avisos      ?? [];
  const podeCalcular = validacao?.podeCalcular ?? false;

  // Seções distintas com erros bloqueantes (para exibir atalhos)
  const secoesComErro = [...new Set(bloqueantes.map((e) => e.secao))];

  return (
    <div className="space-y-4">
      {/* ── Resultado da validação ─────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-800">Verificação de pré-requisitos</h3>

        {bloqueantes.length === 0 && avisos.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <svg viewBox="0 0 16 16" className="h-5 w-5 shrink-0 text-green-500" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 8l2.5 2.5L11 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Todos os requisitos obrigatórios foram atendidos.
          </div>
        ) : (
          <div className="space-y-2">
            {/* Erros bloqueantes */}
            {bloqueantes.map((e, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm">
                <span className="mt-0.5 shrink-0 font-bold text-red-500">✗</span>
                <div className="flex-1">
                  <span className="text-red-800">{e.mensagem}</span>
                </div>
                <button
                  onClick={() => onNavigate(e.secao)}
                  className="shrink-0 text-xs font-semibold text-red-600 hover:underline"
                >
                  Ir para {SECAO_LABEL[e.secao]} →
                </button>
              </div>
            ))}

            {/* Avisos (não bloqueiam) */}
            {avisos.map((e, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm">
                <span className="mt-0.5 shrink-0 text-amber-500">⚠</span>
                <div className="flex-1">
                  <span className="text-amber-800">{e.mensagem}</span>
                  <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-600">aviso</span>
                </div>
                <button
                  onClick={() => onNavigate(e.secao)}
                  className="shrink-0 text-xs font-semibold text-amber-600 hover:underline"
                >
                  Ir para {SECAO_LABEL[e.secao]} →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Painel de ação ────────────────────────────────────── */}
      <div className={`rounded-xl border p-6 text-center ${
        podeCalcular
          ? "border-folk/20 bg-gradient-to-br from-folk/5 to-white"
          : "border-gray-200 bg-gray-50"
      }`}>
        {podeCalcular ? (
          <>
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-folk-gradient text-xl text-white">
              ⚙
            </div>
            <h4 className="mb-1 text-base font-bold text-gray-900">Pronto para calcular!</h4>
            <p className="mb-6 text-sm text-gray-500">
              O motor irá gerar a Lista de Materiais e os valores de Precificação
              com base nos dados definidos nesta versão.
              {avisos.length > 0 && (
                <span className="mt-1 block text-xs text-amber-600">
                  {avisos.length} aviso{avisos.length > 1 ? "s" : ""} não crítico{avisos.length > 1 ? "s" : ""} foram encontrados — o cálculo pode prosseguir.
                </span>
              )}
            </p>
            <button
              onClick={calcular}
              disabled={calculando}
              className="rounded-xl bg-folk-gradient px-8 py-4 text-base font-bold text-white shadow-md hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 transition-opacity"
            >
              {calculando ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Calculando engenharia...
                </span>
              ) : "Calcular Engenharia →"}
            </button>
            {calculando && (
              <p className="mt-3 text-xs text-gray-400">
                Isso pode levar alguns segundos. Não feche a página.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="mb-3 text-3xl">📋</div>
            <h4 className="mb-1 text-base font-semibold text-gray-700">
              {bloqueantes.length} requisito{bloqueantes.length > 1 ? "s" : ""} pendente{bloqueantes.length > 1 ? "s" : ""}
            </h4>
            <p className="mb-4 text-sm text-gray-500">
              Resolva os itens com ✗ acima para liberar o cálculo de engenharia.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {secoesComErro.map((secao) => (
                <button
                  key={secao}
                  onClick={() => onNavigate(secao)}
                  className="rounded-xl border border-folk/30 bg-white px-4 py-2 text-sm font-semibold text-folk hover:bg-folk/5"
                >
                  Ir para {SECAO_LABEL[secao]} →
                </button>
              ))}
            </div>
          </>
        )}

        {erroCalculo && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-left text-sm text-red-700">
            <strong>Erro durante o cálculo:</strong> {erroCalculo}
          </div>
        )}
      </div>
    </div>
  );
}
