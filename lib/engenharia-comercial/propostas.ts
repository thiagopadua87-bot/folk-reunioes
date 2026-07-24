import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AprovacaoExcecao,
  BomItem,
  ComparacaoVersoes,
  DeltaItem,
  EcVersao,
  EcVersaoStatus,
  KpiVersao,
} from "./types";
import { generateComposition } from "./motor-composicao";
import { generatePricing } from "./motor-precificacao";
import type { VersaoConvertRow } from "./mappers";

// ── Criar nova versão ─────────────────────────────────────────

export async function createVersion(
  propostaId: string,
  motivo: string,
  options: { copiarDeVersaoId?: string },
  client: SupabaseClient
): Promise<EcVersao> {
  const { data: user } = await client.auth.getUser();
  if (!user.user) throw new Error("Usuário não autenticado");

  // Próximo número de versão
  const { data: versoes } = await client
    .from("ec_versoes")
    .select("numero")
    .eq("proposta_id", propostaId)
    .order("numero", { ascending: false })
    .limit(1);

  const proximoNumero = ((versoes?.[0]?.numero as number | undefined) ?? 0) + 1;

  const { data: novaVersao, error } = await client
    .from("ec_versoes")
    .insert({
      proposta_id:     propostaId,
      numero:          proximoNumero,
      motivo_revisao:  motivo,
      is_current:      true,
      status:          "rascunho",
      created_by:      user.user.id,
    })
    .select()
    .single();

  if (error || !novaVersao) throw new Error(error?.message ?? "Erro ao criar versão");

  // Copiar dados da versão anterior se solicitado
  if (options.copiarDeVersaoId) {
    await copiarDadosVersao(options.copiarDeVersaoId, novaVersao.id, client);
  }

  // Registrar criação no histórico
  await client.from("ec_historico_versoes").insert({
    versao_id:   novaVersao.id,
    proposta_id: propostaId,
    evento:      "criada",
    descricao:   proximoNumero === 1
      ? "Versão inicial criada"
      : `V${proximoNumero} criada a partir de ${options.copiarDeVersaoId ? `V${proximoNumero - 1}` : "nova proposta"}: ${motivo}`,
    user_id: user.user.id,
  });

  return mapVersao(novaVersao);
}

// ── Copiar dados de versão anterior ──────────────────────────

async function copiarDadosVersao(
  origemId: string,
  destinoId: string,
  client: SupabaseClient
): Promise<void> {
  const [
    { data: projetoDados },
    { data: necessidades },
    { data: premissas },
    { data: versaoSolucoes },
    { data: custos },
  ] = await Promise.all([
    client.from("ec_projeto_dados").select("*").eq("versao_id", origemId).maybeSingle(),
    client.from("ec_necessidades").select("*").eq("versao_id", origemId),
    client.from("ec_premissas").select("*").eq("versao_id", origemId),
    client.from("ec_versao_solucoes").select("*").eq("versao_id", origemId),
    client.from("ec_custos_proposta").select("*").eq("versao_id", origemId),
  ]);

  const inserts: PromiseLike<unknown>[] = [];

  if (projetoDados) {
    const { id: _id, created_at: _c, updated_at: _u, versao_id: _v, ...resto } = projetoDados as Record<string, unknown>;
    inserts.push(client.from("ec_projeto_dados").insert({ ...resto, versao_id: destinoId }));
  }

  if (necessidades?.length) {
    inserts.push(
      client.from("ec_necessidades").insert(
        necessidades.map(({ id: _id, created_at: _c, versao_id: _v, ...r }) => ({
          ...r, versao_id: destinoId,
        }))
      )
    );
  }

  if (premissas?.length) {
    inserts.push(
      client.from("ec_premissas").insert(
        premissas.map(({ id: _id, created_at: _c, versao_id: _v, ...r }) => ({
          ...r, versao_id: destinoId,
        }))
      )
    );
  }

  if (versaoSolucoes?.length) {
    inserts.push(
      client.from("ec_versao_solucoes").insert(
        versaoSolucoes.map(({ id: _id, created_at: _c, versao_id: _v, ...r }) => ({
          ...r, versao_id: destinoId,
        }))
      )
    );
  }

  if (custos?.length) {
    inserts.push(
      client.from("ec_custos_proposta").insert(
        custos.map(({ id: _id, created_at: _c, versao_id: _v, ...r }) => ({
          ...r, versao_id: destinoId,
        }))
      )
    );
  }

  await Promise.all(inserts);
}

// ── Calcular versão (composição + precificação) ───────────────

export async function calcularVersao(
  versaoId: string,
  client: SupabaseClient
): Promise<void> {
  await generateComposition(versaoId, client);
  await generatePricing(versaoId, client);
}

// ── Atualizar status de versão ────────────────────────────────

export async function updateVersaoStatus(
  versaoId: string,
  status: EcVersaoStatus,
  client: SupabaseClient
): Promise<void> {
  const { data: user } = await client.auth.getUser();
  if (!user.user) throw new Error("Usuário não autenticado");

  const { data: versao } = await client
    .from("ec_versoes")
    .select("proposta_id, status")
    .eq("id", versaoId)
    .single();

  if (!versao) throw new Error("Versão não encontrada");

  await client
    .from("ec_versoes")
    .update({ status })
    .eq("id", versaoId);
}

// ── Aprovar exceção de margem ─────────────────────────────────

export async function approveException(
  versaoId: string,
  motivo: string,
  client: SupabaseClient
): Promise<void> {
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) throw new Error("Usuário não autenticado");

  const { data: profileRaw } = await client
    .from("profiles")
    .select("nome")
    .eq("id", authData.user.id)
    .single();
  // Supabase sem tipos gerados retorna any; cast direto de any → tipo concreto é seguro.
  const profile = profileRaw as { nome: string } | null;

  const excecao: AprovacaoExcecao = {
    aprovadorId:   authData.user.id,
    aprovadorNome: profile?.nome ?? authData.user.email ?? "",
    motivo,
    aprovadoEm:    new Date().toISOString(),
  };

  await client
    .from("ec_versoes")
    .update({ status: "aprovacao_concedida", aprovacao_excecao: excecao })
    .eq("id", versaoId);
}

// ── Reprovar exceção de margem ────────────────────────────────

export async function rejectException(
  versaoId: string,
  motivo: string,
  client: SupabaseClient
): Promise<void> {
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) throw new Error("Usuário não autenticado");

  const { data: profileRaw } = await client
    .from("profiles")
    .select("nome")
    .eq("id", authData.user.id)
    .single();
  // Supabase sem tipos gerados retorna any; cast direto de any → tipo concreto é seguro.
  const profile = profileRaw as { nome: string } | null;

  const excecao: AprovacaoExcecao = {
    aprovadorId:   authData.user.id,
    aprovadorNome: profile?.nome ?? authData.user.email ?? "",
    motivo,
    aprovadoEm:    new Date().toISOString(),
  };

  await client
    .from("ec_versoes")
    .update({ status: "aprovacao_negada", aprovacao_excecao: excecao })
    .eq("id", versaoId);
}

// ── Comparar versões ──────────────────────────────────────────

export async function compareVersions(
  versaoIdA: string,
  versaoIdB: string,
  client: SupabaseClient
): Promise<ComparacaoVersoes> {
  const [kpisA, kpisB, listaA, listaB] = await Promise.all([
    carregarKpis(versaoIdA, client),
    carregarKpis(versaoIdB, client),
    carregarLista(versaoIdA, client),
    carregarLista(versaoIdB, client),
  ]);

  const mapA = new Map(listaA.map((i) => [i.itemId, i]));
  const mapB = new Map(listaB.map((i) => [i.itemId, i]));

  const itensAdicionados: DeltaItem[] = [];
  const itensRemovidos:   DeltaItem[] = [];
  const itensAlterados:   DeltaItem[] = [];

  for (const [itemId, itemB] of mapB.entries()) {
    const itemA = mapA.get(itemId);
    if (!itemA) {
      itensAdicionados.push(buildDelta(itemId, itemB.itemSnapshot, 0, 0, itemB.quantidade, itemB.custoUnitario));
    } else if (Math.abs(itemA.quantidade - itemB.quantidade) > 0.001) {
      itensAlterados.push(buildDelta(
        itemId, itemB.itemSnapshot,
        itemA.quantidade, itemA.custoUnitario,
        itemB.quantidade, itemB.custoUnitario
      ));
    }
  }

  for (const [itemId, itemA] of mapA.entries()) {
    if (!mapB.has(itemId)) {
      itensRemovidos.push(buildDelta(itemId, itemA.itemSnapshot, itemA.quantidade, itemA.custoUnitario, 0, 0));
    }
  }

  return {
    versaoIdA,
    versaoIdB,
    kpisA,
    kpisB,
    deltaImplantacao: round2((kpisB.valorImplantacao ?? 0) - (kpisA.valorImplantacao ?? 0)),
    deltaMensal:      round2((kpisB.valorMensal ?? 0) - (kpisA.valorMensal ?? 0)),
    deltaMargemPct:   round2((kpisB.margemPct ?? 0) - (kpisA.margemPct ?? 0)),
    itensAdicionados,
    itensRemovidos,
    itensAlterados,
  };
}

// ── Converter versão aprovada em venda ────────────────────────

export async function convertToSale(
  versaoId: string,
  client: SupabaseClient
): Promise<string> {
  const { data: authData } = await client.auth.getUser();
  if (!authData.user) throw new Error("Usuário não autenticado");

  const { data: versaoRaw } = await client
    .from("ec_versoes")
    .select("proposta_id, status, ec_propostas(pipeline_id, nome), ec_precificacao(valor_implantacao, valor_mensal)")
    .eq("id", versaoId)
    .single();
  // Supabase retorna any; cast direto de any → tipo concreto não precisa de unknown.
  const versao = versaoRaw as VersaoConvertRow | null;

  if (!versao) throw new Error("Versão não encontrada");
  if (!["aprovada_cliente", "aprovacao_concedida"].includes(versao.status)) {
    throw new Error("Apenas versões aprovadas pelo cliente podem ser convertidas em venda");
  }

  const proposta = versao.ec_propostas;
  const prec     = versao.ec_precificacao;

  if (!proposta) throw new Error("Proposta não encontrada");

  const { data: pipeline } = await client
    .from("pipeline")
    .select("cliente")
    .eq("id", proposta.pipeline_id)
    .single();

  if (!pipeline) throw new Error("Pipeline não encontrado");

  const { data: venda, error } = await client
    .from("vendas")
    .insert({
      user_id:          authData.user.id,
      data_fechamento:  new Date().toISOString().slice(0, 10),
      cliente:          (pipeline as Record<string, unknown>).cliente as string,
      valor_implantacao: prec?.valor_implantacao ?? 0,
      valor_mensal:      prec?.valor_mensal      ?? 0,
      servico:           proposta.nome,
      tipo_venda:        "recorrente",
    })
    .select("id")
    .single();

  if (error || !venda) throw new Error(error?.message ?? "Erro ao criar venda");

  // Atualiza pipeline e proposta
  await Promise.all([
    client.from("pipeline").update({ status: "fechado_ganho" }).eq("id", proposta.pipeline_id),
    client.from("ec_propostas").update({ status: "encerrada" }).eq("id", versao.proposta_id),
    client.from("ec_historico_versoes").insert({
      versao_id:   versaoId,
      proposta_id: versao.proposta_id,
      evento:      "convertida_venda",
      descricao:   `Convertida em venda ID ${venda.id}`,
      dados_novos: { venda_id: venda.id },
      user_id:     authData.user.id,
    }),
  ]);

  return venda.id as string;
}

// ── Auxiliares privados ───────────────────────────────────────

function mapVersao(row: Record<string, unknown>): EcVersao {
  return {
    id:               row.id as string,
    propostaId:       row.proposta_id as string,
    numero:           row.numero as number,
    motivoRevisao:    row.motivo_revisao as string,
    isCurrent:        row.is_current as boolean,
    status:           row.status as EcVersaoStatus,
    aprovacaoExcecao: row.aprovacao_excecao as AprovacaoExcecao | null,
    createdBy:        row.created_by as string,
    createdAt:        row.created_at as string,
    updatedAt:        row.updated_at as string,
  };
}

async function carregarKpis(versaoId: string, client: SupabaseClient): Promise<KpiVersao> {
  const { data } = await client
    .from("ec_visao_executiva")
    .select("*")
    .eq("versao_id", versaoId)
    .single();

  return {
    versaoId,
    versaoNumero:     (data?.versao_numero as number)      ?? 0,
    valorImplantacao: (data?.valor_implantacao as number)  ?? 0,
    valorMensal:      (data?.valor_mensal as number)       ?? 0,
    margemPct:        (data?.margem_pct as number)         ?? 0,
    paybackMeses:     (data?.payback_meses as number|null) ?? null,
    roiPct:           (data?.roi_pct as number|null)       ?? null,
    status:           (data?.versao_status as EcVersaoStatus) ?? "rascunho",
  };
}

async function carregarLista(versaoId: string, client: SupabaseClient): Promise<BomItem[]> {
  const { data } = await client
    .from("ec_lista_materiais")
    .select("*")
    .eq("versao_id", versaoId);

  return (data ?? []).map((r) => ({
    itemId:             r.item_id,
    itemSnapshot:       r.item_snapshot ?? {},
    quantidade:         r.quantidade,
    custoUnitario:      r.custo_unitario,
    fornecedorId:       r.fornecedor_id,
    fornecedorSnapshot: r.fornecedor_snapshot ?? {},
    origem:             r.origem,
    origemNome:         r.origem_nome,
    observacoes:        r.observacoes,
    ordem:              r.ordem,
  }));
}

function buildDelta(
  itemId: string,
  snapshot: Record<string, unknown>,
  qtdA: number,
  custoA: number,
  qtdB: number,
  custoB: number
): DeltaItem {
  return {
    itemId,
    nomeItem:        (snapshot?.nome as string) ?? itemId,
    quantidadeA:     qtdA,
    quantidadeB:     qtdB,
    deltaQuantidade: round2(qtdB - qtdA),
    custoA:          round2(qtdA * custoA),
    custoB:          round2(qtdB * custoB),
    deltaCusto:      round2(qtdB * custoB - qtdA * custoA),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
