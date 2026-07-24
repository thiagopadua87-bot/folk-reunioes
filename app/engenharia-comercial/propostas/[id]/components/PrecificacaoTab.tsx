"use client";

import { useState, useEffect } from "react";
import { buscarPrecificacao } from "@/lib/engenharia-comercial/engenharia-db";
import type { PrecificacaoView } from "@/lib/engenharia-comercial/engenharia-db";
import { paybackMeses, formatPayback } from "@/lib/engenharia-comercial/kpi-utils";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PCT = (v: number) => `${v.toFixed(2).replace(".", ",")}%`;

// ── KPI card ─────────────────────────────────────────────────

function KpiCard({
  label,
  valor,
  alerta,
  destaque,
}: {
  label:    string;
  valor:    string;
  alerta?:  string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        destaque
          ? "border-folk/30 bg-gradient-to-br from-folk/5 to-white"
          : "border-gray-200 bg-white"
      }`}
    >
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${destaque ? "text-folk" : "text-gray-900"}`}>{valor}</p>
      {alerta && (
        <p className="mt-1 text-xs font-medium text-amber-600">{alerta}</p>
      )}
    </div>
  );
}

// ── Linha de etapa ────────────────────────────────────────────

function EtapaLinha({
  etapa,
  isTotal,
  isSubtotal,
}: {
  etapa:      PrecificacaoView["etapas"][number];
  isTotal?:   boolean;
  isSubtotal?: boolean;
}) {
  const isSeparador = etapa.etapa.startsWith("─") || etapa.etapa.startsWith("━");

  if (isSeparador) {
    return <tr className="border-t-2 border-gray-300"><td colSpan={3} /></tr>;
  }

  return (
    <tr
      className={`border-b border-gray-50 ${
        isTotal    ? "bg-folk/5 font-bold" :
        isSubtotal ? "bg-gray-50 font-semibold" : ""
      }`}
    >
      <td className={`py-2 pl-4 pr-2 text-sm ${
        isTotal ? "text-folk" : isSubtotal ? "text-gray-800" : "text-gray-700"
      }`}>
        {isTotal || isSubtotal ? etapa.etapa : (
          <span className="pl-2 text-gray-600">{etapa.etapa}</span>
        )}
      </td>
      <td className="px-2 py-2 text-right text-sm font-mono text-gray-900">
        {etapa.valor !== 0 ? BRL.format(etapa.valor) : "—"}
      </td>
      <td className="py-2 pl-2 pr-4 text-xs text-gray-400 italic">
        {etapa.formula ?? ""}
      </td>
    </tr>
  );
}

// ── Bloco de parâmetros ───────────────────────────────────────

const PARAM_LABELS: Record<string, string> = {
  bdi_percentual:                   "BDI",
  total_impostos_percentual:        "Impostos",
  margem_minima_percentual:         "Margem mínima",
  margem_alvo_percentual:           "Margem alvo",
  custo_monitoramento_por_cliente:  "Monitoramento/cliente",
  custo_suporte_por_cliente:        "Suporte/cliente",
  custo_telefonia_por_cliente:      "Telefonia/portaria",
  custo_licenca_software_por_cliente: "Licença de software/cliente",
};

function ParametrosSection({
  parametros,
}: {
  parametros: Record<string, number>;
}) {
  const [aberto, setAberto] = useState(false);
  const entries = Object.entries(parametros);

  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50/50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700">
          Parâmetros utilizados no cálculo
        </span>
        <svg
          viewBox="0 0 16 16"
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${aberto ? "rotate-180" : ""}`}
          fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {aberto && (
        <div className="border-t border-gray-100">
          <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
            {entries.map(([k, v]) => {
              const isPercent = k.includes("percentual");
              return (
                <div key={k} className="bg-white px-4 py-3">
                  <p className="text-xs text-gray-500">
                    {PARAM_LABELS[k] ?? k.replace(/_/g, " ")}
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-gray-900">
                    {isPercent ? PCT(v) : BRL.format(v)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────

const ETAPAS_TOTAIS = new Set([
  "= Valor de implantação",
  "= Custo mensal total",
  "= Valor mensal",
]);

const ETAPAS_SUBTOTAIS = new Set([
  "BDI",
  "Impostos",
  "Custo de materiais",
  "Custo de instalação (MO)",
  "Outros custos únicos",
  "Margem calculada",
]);

export function PrecificacaoTab({ versaoId }: { versaoId: string }) {
  const [dados, setDados] = useState<PrecificacaoView | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setCarregando(true); setErro(null);
    buscarPrecificacao(versaoId)
      .then(setDados)
      .catch((e) => setErro((e as Error).message))
      .finally(() => setCarregando(false));
  }, [versaoId]);

  if (carregando) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />)}
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Erro ao carregar precificação: {erro}
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-10 text-center">
        <p className="text-3xl">💰</p>
        <p className="mt-2 text-sm font-semibold text-gray-600">Precificação não disponível</p>
        <p className="mt-1 text-xs text-gray-400">
          Execute o cálculo de engenharia para gerar os valores financeiros.
        </p>
      </div>
    );
  }

  const margemOk = dados.margemAplicada >= dados.margemMinima;
  const lucroMensal = dados.valorMensal - dados.custoMensalOperacional - dados.custoMensalAdicional;
  const mesesPayback = paybackMeses(dados.valorImplantacao, lucroMensal);

  const calculadoEm = dados.calculatedAt
    ? new Date(dados.calculatedAt).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-5">
      {/* ── Alerta de aprovação ── */}
      {dados.requiresApproval && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <span className="mt-0.5 shrink-0 text-amber-500">⚠</span>
          <div>
            <p className="text-sm font-semibold text-amber-900">Aprovação necessária</p>
            <p className="mt-0.5 text-xs text-amber-700">
              A margem calculada ({PCT(dados.margemAplicada)}) está abaixo da margem mínima exigida ({PCT(dados.margemMinima)}).
              Esta proposta precisa de aprovação da gerência antes do envio ao cliente.
            </p>
          </div>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Valor de implantação"
          valor={BRL.format(dados.valorImplantacao)}
          destaque
        />
        <KpiCard
          label="Mensalidade"
          valor={BRL.format(dados.valorMensal)}
        />
        <KpiCard
          label="Margem"
          valor={PCT(dados.margemAplicada)}
          alerta={!margemOk ? `Abaixo do mínimo de ${PCT(dados.margemMinima)}` : undefined}
        />
        <KpiCard
          label="Payback estimado"
          valor={formatPayback(mesesPayback)}
        />
      </div>

      {/* ── Memorial de cálculo ── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-800">Memorial de cálculo</h3>
          {calculadoEm && (
            <p className="text-xs text-gray-400">Calculado em {calculadoEm}</p>
          )}
        </div>

        {dados.etapas.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-400">
            Nenhuma etapa de cálculo registrada.
          </p>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                <th className="py-2 pl-4 pr-2 text-left">Etapa</th>
                <th className="px-2 py-2 text-right">Valor</th>
                <th className="py-2 pl-2 pr-4 text-left">Fórmula / Nota</th>
              </tr>
            </thead>
            <tbody>
              {dados.etapas.map((etapa, i) => (
                <EtapaLinha
                  key={i}
                  etapa={etapa}
                  isTotal={ETAPAS_TOTAIS.has(etapa.etapa)}
                  isSubtotal={ETAPAS_SUBTOTAIS.has(etapa.etapa)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Detalhamento de custos ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <CustoCard label="Custo de materiais"      valor={dados.custoTotalMateriais}    />
        <CustoCard label="Mão de obra (instalação)" valor={dados.custoInstalacao}        />
        <CustoCard label="Outros custos únicos"     valor={dados.custoOutrosUnicos}      />
        <CustoCard label="BDI aplicado"             valor={dados.bdiAplicado}            />
        <CustoCard label="Impostos"                 valor={dados.impostosAplicados}      />
        <CustoCard label="Custo mensal operacional" valor={dados.custoMensalOperacional} />
      </div>

      {/* ── Parâmetros ── */}
      <ParametrosSection parametros={dados.parametrosUtilizados} />
    </div>
  );
}

function CustoCard({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-gray-800">{BRL.format(valor)}</p>
    </div>
  );
}
