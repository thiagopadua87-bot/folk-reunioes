import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EtapaCalculo,
  MemorialCalculo,
  PrecificacaoInput,
  PrecificacaoResult,
} from "./types";

// ── Função pura principal ─────────────────────────────────────

export function computePricing(input: PrecificacaoInput): PrecificacaoResult {
  const { itensLista, custosAdicionais, parametros: p } = input;

  // Parâmetros financeiros com fallbacks
  const bdi              = p["bdi_percentual"]                    ?? 25;
  const totalImpostos    = p["total_impostos_percentual"]         ?? 11.73;
  const margemMinima     = p["margem_minima_percentual"]          ?? 20;
  const margemAlvo       = p["margem_alvo_percentual"]            ?? 30;
  const custoMonitor     = p["custo_monitoramento_por_cliente"]   ?? 80;
  const custoSuporte     = p["custo_suporte_por_cliente"]         ?? 35;
  const custoTelefonia   = p["custo_telefonia_por_cliente"]       ?? 45;
  const custoLicenca     = p["custo_licenca_software_por_cliente"] ?? 20;

  // ── 1. Materiais ──────────────────────────────────────────
  const custoTotalMateriais = round2(
    itensLista.reduce((s, i) => s + i.quantidade * i.custoUnitario, 0)
  );

  // ── 2. Custos únicos adicionais (instalação e outros) ────
  const custoInstalacao = round2(
    custosAdicionais
      .filter((c) => c.categoria === "mao_de_obra" && c.tipoCusto === "unico")
      .reduce((s, c) => s + c.valor, 0)
  );

  const custoOutrosUnicos = round2(
    custosAdicionais
      .filter((c) => c.categoria !== "mao_de_obra" && c.tipoCusto === "unico")
      .reduce((s, c) => s + c.valor, 0)
  );

  // ── 3. BDI e impostos sobre custo total ──────────────────
  const subtotalPreBDI  = custoTotalMateriais + custoInstalacao + custoOutrosUnicos;
  const valorBDI        = round2(subtotalPreBDI * (bdi / 100));
  const subtotalComBDI  = round2(subtotalPreBDI + valorBDI);
  const valorImpostos   = round2(subtotalComBDI * (totalImpostos / 100));
  const valorImplantacao = round2(subtotalComBDI + valorImpostos);

  // ── 4. Custos mensais ─────────────────────────────────────
  const custoMensalOperacional = round2(
    custoMonitor + custoSuporte + custoTelefonia + custoLicenca
  );

  const custoMensalAdicional = round2(
    custosAdicionais
      .filter((c) => c.tipoCusto === "mensal")
      .reduce((s, c) => s + c.valor, 0)
  );

  // Custos anuais rateados em 12 meses
  const custoAnualRateado = round2(
    custosAdicionais
      .filter((c) => c.tipoCusto === "anual")
      .reduce((s, c) => s + c.valor, 0) / 12
  );

  const custoMensalTotal = round2(
    custoMensalOperacional + custoMensalAdicional + custoAnualRateado
  );

  // ── 5. Precificação pela margem alvo ──────────────────────
  // valor_mensal = custo_mensal / (1 - margem_alvo%)
  const divisor = 1 - margemAlvo / 100;
  const valorMensal = divisor > 0 ? round2(custoMensalTotal / divisor) : custoMensalTotal;

  // ── 6. Margem real calculada ──────────────────────────────
  const margemCalculada =
    valorMensal > 0
      ? round2(((valorMensal - custoMensalTotal) / valorMensal) * 100)
      : 0;

  const requiresApproval = margemCalculada < margemMinima;

  // ── 7. Memorial de cálculo ────────────────────────────────
  const etapas: EtapaCalculo[] = [
    { etapa: "Custo de materiais",           valor: custoTotalMateriais },
    { etapa: "Custo de instalação (MO)",     valor: custoInstalacao },
    { etapa: "Outros custos únicos",         valor: custoOutrosUnicos },
    { etapa: `BDI ${bdi}%`,                 valor: valorBDI,
      formula: `(${subtotalPreBDI} × ${bdi}%) = ${valorBDI}` },
    { etapa: `Impostos ${totalImpostos}%`,   valor: valorImpostos,
      formula: `(${subtotalComBDI} × ${totalImpostos}%) = ${valorImpostos}` },
    { etapa: "= Valor de implantação",       valor: valorImplantacao },
    { etapa: "─" ,                           valor: 0 },
    { etapa: "Monitoramento/cliente",        valor: custoMonitor },
    { etapa: "Suporte/cliente",              valor: custoSuporte },
    { etapa: "Telefonia/portaria",           valor: custoTelefonia },
    { etapa: "Licença de software",          valor: custoLicenca },
    { etapa: "Custos mensais adicionais",    valor: custoMensalAdicional },
    ...(custoAnualRateado > 0
      ? [{ etapa: "Custos anuais (÷12)",     valor: custoAnualRateado }]
      : []),
    { etapa: "= Custo mensal total",         valor: custoMensalTotal },
    { etapa: `Margem alvo ${margemAlvo}%`,   valor: margemAlvo,
      formula: `custo / (1 - ${margemAlvo}%) = ${valorMensal}` },
    { etapa: "= Valor mensal",               valor: valorMensal },
    { etapa: "Margem calculada",             valor: margemCalculada,
      formula: `(${valorMensal} - ${custoMensalTotal}) / ${valorMensal} × 100` },
  ];

  const memorial: MemorialCalculo = {
    parametrosUtilizados: {
      bdi_percentual:                   bdi,
      total_impostos_percentual:        totalImpostos,
      margem_minima_percentual:         margemMinima,
      margem_alvo_percentual:           margemAlvo,
      custo_monitoramento_por_cliente:  custoMonitor,
      custo_suporte_por_cliente:        custoSuporte,
      custo_telefonia_por_cliente:      custoTelefonia,
      custo_licenca_software_por_cliente: custoLicenca,
    },
    etapas,
    margemCalculada,
    margemMinima,
    aprovacaoNecessaria: requiresApproval,
  };

  return {
    custoTotalMateriais,
    custoInstalacao,
    custoOutrosUnicos,
    bdiAplicado:             bdi,
    impostosAplicados:       totalImpostos,
    valorImplantacao,
    custoMensalOperacional,
    custoMensalAdicional,
    margemAplicada:          margemCalculada,
    valorMensal,
    memorialCalculo:         memorial,
    requiresApproval,
  };
}

// ── Orquestrador com banco de dados ──────────────────────────

export async function generatePricing(
  versaoId: string,
  client: SupabaseClient
): Promise<PrecificacaoResult> {
  const [
    { data: listaMateriais },
    { data: custosRows },
    { data: parametrosJson },
  ] = await Promise.all([
    client
      .from("ec_lista_materiais")
      .select("quantidade, custo_unitario")
      .eq("versao_id", versaoId),
    client
      .from("ec_custos_proposta")
      .select("categoria, tipo_custo, valor")
      .eq("versao_id", versaoId),
    client.rpc("ec_parametros_json"),
  ]);

  const result = computePricing({
    itensLista: (listaMateriais ?? []).map((r) => ({
      quantidade:    r.quantidade,
      custoUnitario: r.custo_unitario,
    })),
    custosAdicionais: (custosRows ?? []).map((r) => ({
      id: "", versaoId, fornecedorId: null, observacoes: "", ordem: 0, descricao: "",
      categoria:  r.categoria,
      tipoCusto:  r.tipo_custo,
      valor:      r.valor,
    })),
    parametros: (parametrosJson as Record<string, number>) ?? {},
  });

  await client.from("ec_precificacao").upsert(
    {
      versao_id:                versaoId,
      custo_total_materiais:    result.custoTotalMateriais,
      custo_instalacao:         result.custoInstalacao,
      custo_outros_unicos:      result.custoOutrosUnicos,
      bdi_aplicado:             result.bdiAplicado,
      impostos_aplicados:       result.impostosAplicados,
      valor_implantacao:        result.valorImplantacao,
      custo_mensal_operacional: result.custoMensalOperacional,
      custo_mensal_adicional:   result.custoMensalAdicional,
      margem_aplicada:          result.margemAplicada,
      valor_mensal:             result.valorMensal,
      memorial_calculo:         result.memorialCalculo,
      requires_approval:        result.requiresApproval,
      calculated_at:            new Date().toISOString(),
    },
    { onConflict: "versao_id" }
  );

  return result;
}

// ── Utilidades ────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
