/**
 * Funções de carregamento de dados para geração de PDFs.
 * Lê exclusivamente das camadas de domínio — nunca acessa o Supabase diretamente.
 */

import type { SupabaseClient }  from "@supabase/supabase-js";
import { buscarPropostaDetalhe, buscarKpisVersao } from "@/lib/engenharia-comercial/propostas-db";
import { listarBom, buscarPrecificacao, buscarMemorialEngenharia } from "@/lib/engenharia-comercial/engenharia-db";
import type { PropostaDetalhe, VersaoKpis } from "@/lib/engenharia-comercial/propostas-db";
import type { BomItemView, PrecificacaoView, MemorialEngenharia } from "@/lib/engenharia-comercial/engenharia-db";

// ── Tipos ─────────────────────────────────────────────────────

export type VersaoBasica = {
  id:      string;
  numero:  number;
  status:  string;
  propostaId: string;
};

export type ProjetoDadosPdf = {
  tipoCondominio:   string;
  numeroUnidades:   number;
  numeroPortarias:  number;
  numeroAcessos:    number;
  numeroElevadores: number;
  areaTotal:        number;
  observacoes:      string;
};

export type SolucaoResumo = {
  categoria:   string;
  solucaoNome: string;
  segmento:    string;
};

/** Dados comuns a ambos os templates (executivo e técnico). */
export type DadosComuns = {
  proposta:     PropostaDetalhe;
  versao:       VersaoBasica;
  kpis:         VersaoKpis | null;
  projetoDados: ProjetoDadosPdf | null;
  solucoes:     SolucaoResumo[];
};

/** Dados completos para o template técnico. */
export type DadosTecnico = DadosComuns & {
  bom:      BomItemView[];
  memorial: MemorialEngenharia;
  prec:     PrecificacaoView | null;
};

// ── Helpers ───────────────────────────────────────────────────

async function buscarVersaoBasica(versaoId: string, client: SupabaseClient): Promise<VersaoBasica | null> {
  const { data } = await client
    .from("ec_versoes")
    .select("id, numero, status, proposta_id")
    .eq("id", versaoId)
    .maybeSingle();
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    id:         d.id as string,
    numero:     d.numero as number,
    status:     d.status as string,
    propostaId: d.proposta_id as string,
  };
}

async function buscarProjetoDados(versaoId: string, client: SupabaseClient): Promise<ProjetoDadosPdf | null> {
  const { data } = await client
    .from("ec_projeto_dados")
    .select("tipo_condominio, numero_unidades, numero_portarias, numero_acessos, numero_elevadores, area_total, observacoes")
    .eq("versao_id", versaoId)
    .maybeSingle();
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    tipoCondominio:   (d.tipo_condominio as string)   || "",
    numeroUnidades:   (d.numero_unidades as number)   || 0,
    numeroPortarias:  (d.numero_portarias as number)  || 0,
    numeroAcessos:    (d.numero_acessos as number)    || 0,
    numeroElevadores: (d.numero_elevadores as number) || 0,
    areaTotal:        (d.area_total as number)        || 0,
    observacoes:      (d.observacoes as string)       || "",
  };
}

async function buscarSolucoes(versaoId: string, client: SupabaseClient): Promise<SolucaoResumo[]> {
  const { data } = await client
    .from("ec_versao_solucoes")
    .select("categoria, solucao_id, ec_solucoes(nome, segmento)")
    .eq("versao_id", versaoId);
  return (data ?? []).map((r) => {
    const d   = r as Record<string, unknown>;
    const sol = d.ec_solucoes as Record<string, string> | null;
    return {
      categoria:   d.categoria as string,
      solucaoNome: sol?.nome    ?? "(sem solução)",
      segmento:    sol?.segmento ?? "",
    };
  });
}

// ── Carregadores públicos ─────────────────────────────────────

/** Dados para o PDF Executivo (voltado ao cliente — sem BOM/memorial). */
export async function carregarDadosExecutivo(versaoId: string, client: SupabaseClient): Promise<DadosComuns> {
  const versao = await buscarVersaoBasica(versaoId, client);
  if (!versao) throw new Error("Versão não encontrada.");

  const [proposta, kpis, projetoDados, solucoes] = await Promise.all([
    buscarPropostaDetalhe(versao.propostaId, client),
    buscarKpisVersao(versaoId, client),
    buscarProjetoDados(versaoId, client),
    buscarSolucoes(versaoId, client),
  ]);

  if (!proposta) throw new Error("Proposta não encontrada.");

  return { proposta, versao, kpis, projetoDados, solucoes };
}

/** Dados para o PDF Técnico (uso interno — inclui BOM, memorial, precificação). */
export async function carregarDadosTecnico(versaoId: string, client: SupabaseClient): Promise<DadosTecnico> {
  const versao = await buscarVersaoBasica(versaoId, client);
  if (!versao) throw new Error("Versão não encontrada.");

  const [proposta, kpis, projetoDados, solucoes, bom, prec, memorial] = await Promise.all([
    buscarPropostaDetalhe(versao.propostaId, client),
    buscarKpisVersao(versaoId, client),
    buscarProjetoDados(versaoId, client),
    buscarSolucoes(versaoId, client),
    listarBom(versaoId, client),
    buscarPrecificacao(versaoId, client),
    buscarMemorialEngenharia(versaoId, client),
  ]);

  if (!proposta) throw new Error("Proposta não encontrada.");

  return { proposta, versao, kpis, projetoDados, solucoes, bom, prec, memorial };
}
