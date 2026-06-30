import { supabase } from "./supabase";

// ── Tipos ────────────────────────────────────────────────────────

export const STATUS_FATURA = [
  { value: "pendente",            label: "Pendente",              cor: "bg-gray-100 text-gray-700" },
  { value: "em_cobranca",         label: "Em cobrança",           cor: "bg-yellow-100 text-yellow-700" },
  { value: "promessa_pagamento",  label: "Promessa de pagamento", cor: "bg-blue-100 text-blue-700" },
  { value: "negociada",           label: "Negociada",             cor: "bg-purple-100 text-purple-700" },
  { value: "juridico",            label: "Jurídico",              cor: "bg-orange-100 text-orange-700" },
  { value: "protestada",          label: "Protestada",            cor: "bg-red-100 text-red-700" },
  { value: "recebida",            label: "Recebida",              cor: "bg-green-100 text-green-700" },
  { value: "cancelada",           label: "Cancelada",             cor: "bg-gray-100 text-gray-500" },
] as const;

export type StatusFatura = (typeof STATUS_FATURA)[number]["value"];

export interface Fatura {
  id: string;
  user_id: string;
  numero_nota: string;
  cliente: string;
  data_vencimento: string;
  mes_referencia: string;
  valor: number;
  status: StatusFatura;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InadimplenciaAcao {
  id: string;
  fatura_id: string;
  usuario_id: string;
  tipo_acao: string;
  descricao: string | null;
  proxima_acao: string | null;
  data_proxima_acao: string | null;
  created_at: string;
  usuario_nome?: string;
}

export interface UltimaAcaoFatura {
  fatura_id: string;
  tipo_acao: string;
  descricao: string | null;
  proxima_acao: string | null;
  data_proxima_acao: string | null;
  created_at: string;
  usuario_nome: string;
}

export interface InadimplenciaResponsavel {
  id: string;
  cliente: string;
  usuario_id: string;
  created_at: string;
  usuario_nome?: string;
}

export interface TipoAcaoCobranca {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export interface FiltrosFaturas {
  busca?: string;
  status?: StatusFatura | "";
  mes_referencia?: string;
  somente_abertas?: boolean;
}

export interface ResultadoImportacao {
  criadas: number;
  atualizadas: number;
  quitadas: number;
  erros: string[];
}

export interface LinhaImportacao {
  numero_nota: string;
  cliente: string;
  data_vencimento: string;
  valor: number;
}

// ── Faturas ──────────────────────────────────────────────────────

export async function listarFaturas(filtros?: FiltrosFaturas): Promise<Fatura[]> {
  let q = supabase.from("faturas").select("*").order("data_vencimento", { ascending: true });

  if (filtros?.somente_abertas) {
    q = q.not("status", "in", '("recebida","cancelada")');
  }
  if (filtros?.status) q = q.eq("status", filtros.status);
  if (filtros?.mes_referencia) q = q.eq("mes_referencia", filtros.mes_referencia);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  let lista = (data ?? []) as Fatura[];

  if (filtros?.busca) {
    const b = filtros.busca.toLowerCase();
    lista = lista.filter(
      (f) =>
        f.cliente.toLowerCase().includes(b) ||
        f.numero_nota.toLowerCase().includes(b),
    );
  }

  return lista;
}

export async function atualizarStatusFatura(id: string, status: StatusFatura, observacoes?: string): Promise<void> {
  const payload: Partial<Fatura> & { updated_at: string } = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (observacoes !== undefined) payload.observacoes = observacoes;

  const { error } = await supabase.from("faturas").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function importarFaturas(
  linhas: LinhaImportacao[],
  userId: string,
): Promise<ResultadoImportacao> {
  const resultado: ResultadoImportacao = { criadas: 0, atualizadas: 0, quitadas: 0, erros: [] };

  // Busca todas as faturas abertas no banco
  const { data: abertas, error: errAbertas } = await supabase
    .from("faturas")
    .select("id, numero_nota, valor, data_vencimento")
    .not("status", "in", '("recebida","cancelada")');

  if (errAbertas) throw new Error(errAbertas.message);

  const abertasMap = new Map<string, { id: string; valor: number; data_vencimento: string }>();
  (abertas ?? []).forEach((f) => abertasMap.set(f.numero_nota, f));

  const notasNaplanilha = new Set(linhas.map((l) => l.numero_nota));

  // Faturas abertas que NÃO estão na planilha → quitadas
  for (const [nota, fatura] of abertasMap.entries()) {
    if (!notasNaplanilha.has(nota)) {
      const { error } = await supabase
        .from("faturas")
        .update({ status: "recebida", updated_at: new Date().toISOString() })
        .eq("id", fatura.id);
      if (error) resultado.erros.push(`Erro ao quitar ${nota}: ${error.message}`);
      else resultado.quitadas++;
    }
  }

  // Processa cada linha da planilha
  for (const linha of linhas) {
    if (!linha.numero_nota || !linha.cliente) continue;

    const mesRef = linha.data_vencimento.slice(0, 7); // YYYY-MM

    const existente = abertasMap.get(linha.numero_nota);

    if (existente) {
      // Atualiza se valor ou vencimento mudou
      const mesmoValor = Math.abs(existente.valor - linha.valor) < 0.01;
      const mesmoVenc  = existente.data_vencimento === linha.data_vencimento;
      if (!mesmoValor || !mesmoVenc) {
        const { error } = await supabase
          .from("faturas")
          .update({ valor: linha.valor, data_vencimento: linha.data_vencimento, mes_referencia: mesRef, updated_at: new Date().toISOString() })
          .eq("id", existente.id);
        if (error) resultado.erros.push(`Erro ao atualizar ${linha.numero_nota}: ${error.message}`);
        else resultado.atualizadas++;
      }
    } else {
      // Cria nova fatura
      const { error } = await supabase.from("faturas").insert({
        user_id: userId,
        numero_nota: linha.numero_nota,
        cliente: linha.cliente,
        data_vencimento: linha.data_vencimento,
        mes_referencia: mesRef,
        valor: linha.valor,
        status: "pendente",
      });
      if (error) resultado.erros.push(`Erro ao criar ${linha.numero_nota}: ${error.message}`);
      else resultado.criadas++;
    }
  }

  return resultado;
}

// ── Ações de Inadimplência ───────────────────────────────────────

export async function listarAcoesFatura(faturaId: string): Promise<InadimplenciaAcao[]> {
  const { data, error } = await supabase
    .from("inadimplencia_acoes")
    .select("*")
    .eq("fatura_id", faturaId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const acoes = (data ?? []) as InadimplenciaAcao[];

  // Busca nomes dos usuários em lote
  const ids = [...new Set(acoes.map((a) => a.usuario_id))];
  const nomes: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: perfis } = await supabase
      .from("profiles")
      .select("id, nome")
      .in("id", ids);
    (perfis ?? []).forEach((p: { id: string; nome: string }) => { nomes[p.id] = p.nome; });
  }

  return acoes.map((a) => ({ ...a, usuario_nome: nomes[a.usuario_id] ?? "—" }));
}

export async function registrarAcao(payload: {
  fatura_id: string;
  usuario_id: string;
  tipo_acao: string;
  descricao?: string;
  proxima_acao?: string;
  data_proxima_acao?: string;
  novo_status?: StatusFatura;
}): Promise<void> {
  const { novo_status, ...acao } = payload;

  const { error } = await supabase.from("inadimplencia_acoes").insert(acao);
  if (error) throw new Error(error.message);

  if (novo_status) {
    await atualizarStatusFatura(payload.fatura_id, novo_status);
  }
}

export async function excluirAcao(id: string): Promise<void> {
  const { error } = await supabase.from("inadimplencia_acoes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Responsáveis ─────────────────────────────────────────────────

export async function listarResponsaveis(): Promise<InadimplenciaResponsavel[]> {
  const { data, error } = await supabase
    .from("inadimplencia_responsaveis")
    .select("*")
    .order("cliente");
  if (error) throw new Error(error.message);

  const lista = (data ?? []) as InadimplenciaResponsavel[];
  const ids = [...new Set(lista.map((r) => r.usuario_id))];
  const nomes: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: perfis } = await supabase
      .from("profiles")
      .select("id, nome")
      .in("id", ids);
    (perfis ?? []).forEach((p: { id: string; nome: string }) => { nomes[p.id] = p.nome; });
  }

  return lista.map((r) => ({ ...r, usuario_nome: nomes[r.usuario_id] ?? "—" }));
}

export async function definirResponsavel(cliente: string, usuarioId: string): Promise<void> {
  const { error } = await supabase
    .from("inadimplencia_responsaveis")
    .upsert({ cliente, usuario_id: usuarioId }, { onConflict: "cliente" });
  if (error) throw new Error(error.message);
}

export async function removerResponsavel(id: string): Promise<void> {
  const { error } = await supabase.from("inadimplencia_responsaveis").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Tipos de Ação ────────────────────────────────────────────────

export async function listarTiposAcao(somenteativos = false): Promise<TipoAcaoCobranca[]> {
  let q = supabase.from("tipos_acao_cobranca").select("*").order("nome");
  if (somenteativos) q = q.eq("ativo", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as TipoAcaoCobranca[];
}

export async function criarTipoAcao(nome: string): Promise<void> {
  const { error } = await supabase.from("tipos_acao_cobranca").insert({ nome });
  if (error) throw new Error(error.message);
}

export async function alternarTipoAcao(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from("tipos_acao_cobranca").update({ ativo }).eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Última ação por fatura (batch, sem N+1) ──────────────────────

export async function buscarUltimasAcoes(faturaIds: string[]): Promise<Map<string, UltimaAcaoFatura>> {
  if (faturaIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("inadimplencia_acoes")
    .select("fatura_id, tipo_acao, descricao, proxima_acao, data_proxima_acao, created_at, usuario_id")
    .in("fatura_id", faturaIds)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Coleta IDs únicos de usuários para buscar nomes em lote
  const rows = (data ?? []) as (InadimplenciaAcao & { usuario_id: string })[];
  const uids = [...new Set(rows.map((r) => r.usuario_id))];
  const nomes: Record<string, string> = {};
  if (uids.length > 0) {
    const { data: perfis } = await supabase.from("profiles").select("id, nome").in("id", uids);
    (perfis ?? []).forEach((p: { id: string; nome: string }) => { nomes[p.id] = p.nome; });
  }

  // Mantém apenas a mais recente por fatura (já ordenado DESC)
  const mapa = new Map<string, UltimaAcaoFatura>();
  for (const row of rows) {
    if (!mapa.has(row.fatura_id)) {
      mapa.set(row.fatura_id, {
        fatura_id:         row.fatura_id,
        tipo_acao:         row.tipo_acao,
        descricao:         row.descricao,
        proxima_acao:      row.proxima_acao,
        data_proxima_acao: row.data_proxima_acao,
        created_at:        row.created_at,
        usuario_nome:      nomes[row.usuario_id] ?? "—",
      });
    }
  }
  return mapa;
}

// ── Status de Negociação (nível cliente) ─────────────────────────

export const STATUS_NEGOCIACAO = [
  { value: "juridico",   label: "Jurídico",              cor: "bg-red-100 text-red-700 border-red-200" },
  { value: "promessa",   label: "Promessa de pagamento", cor: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "aguardando", label: "Aguardando retorno",    cor: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "negociacao", label: "Em negociação",         cor: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "sem_contato","label": "Sem contato",         cor: "bg-gray-100 text-gray-600 border-gray-200" },
] as const;

export type StatusNegociacao = (typeof STATUS_NEGOCIACAO)[number]["value"];

export function deriveStatusNegociacao(
  faturas: Fatura[],
  ultimaAcao: UltimaAcaoFatura | null,
): StatusNegociacao {
  if (faturas.some((f) => ["juridico", "protestada"].includes(f.status))) return "juridico";
  if (faturas.some((f) => f.status === "promessa_pagamento")) return "promessa";
  if (ultimaAcao?.proxima_acao) return "aguardando";
  if (faturas.some((f) => ["negociada", "em_cobranca"].includes(f.status))) return "negociacao";
  if (ultimaAcao) return "negociacao";
  return "sem_contato";
}

export async function listarAcoesCliente(faturaIds: string[]): Promise<InadimplenciaAcao[]> {
  if (faturaIds.length === 0) return [];
  const { data, error } = await supabase
    .from("inadimplencia_acoes")
    .select("*")
    .in("fatura_id", faturaIds)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const acoes = (data ?? []) as InadimplenciaAcao[];
  const uids = [...new Set(acoes.map((a) => a.usuario_id))];
  const nomes: Record<string, string> = {};
  if (uids.length > 0) {
    const { data: perfis } = await supabase.from("profiles").select("id, nome").in("id", uids);
    (perfis ?? []).forEach((p: { id: string; nome: string }) => { nomes[p.id] = p.nome; });
  }
  return acoes.map((a) => ({ ...a, usuario_nome: nomes[a.usuario_id] ?? "—" }));
}

// ── Dashboard KPIs ───────────────────────────────────────────────

export interface MaiorDevedor {
  cliente: string;
  valor: number;
}

export interface KPIsCobranca {
  semAcao: number;
  comPromessa: number;
  negociadas: number;
  juridico: number;
  protestadas: number;
  recebidas: number;
  totalAberto: number;
  valorAberto: number;
  faturasVencidas: number;
  valorRecebidoMes: number;
  maiorDevedor: MaiorDevedor | null;
}

export async function carregarKPIsCobranca(mesReferencia?: string): Promise<KPIsCobranca> {
  const hoje = new Date().toISOString().slice(0, 10);
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  // Busca todas as faturas (sem filtro de mês para calcular recebidas no mês atual)
  const { data: todasFaturas, error } = await supabase
    .from("faturas")
    .select("id, status, valor, data_vencimento, updated_at, cliente");
  if (error) throw new Error(error.message);

  const todas = (todasFaturas ?? []) as {
    id: string; status: StatusFatura; valor: number;
    data_vencimento: string; updated_at: string; cliente: string;
  }[];

  // Aplica filtro de mês de referência se necessário
  let faturasScope = todas;
  if (mesReferencia) {
    // Filtra pelo mês de referência (precisa da coluna mes_referencia)
    const { data: comMes } = await supabase
      .from("faturas")
      .select("id")
      .eq("mes_referencia", mesReferencia);
    const idsDoMes = new Set((comMes ?? []).map((f: { id: string }) => f.id));
    faturasScope = todas.filter((f) => idsDoMes.has(f.id));
  }

  // Faturas sem nenhuma ação registrada (abertas no escopo)
  const { data: comAcao } = await supabase.from("inadimplencia_acoes").select("fatura_id");
  const idsComAcao = new Set((comAcao ?? []).map((a: { fatura_id: string }) => a.fatura_id));

  const abertas  = faturasScope.filter((f) => f.status !== "recebida" && f.status !== "cancelada");
  const vencidas = abertas.filter((f) => f.data_vencimento < hoje);

  // Recebidas no mês corrente (updated_at no mês atual)
  const recebidosNoMes = todas.filter(
    (f) => f.status === "recebida" && f.updated_at >= inicioMes,
  );

  // Maior devedor (cliente com maior soma de faturas abertas)
  const porCliente = new Map<string, number>();
  for (const f of abertas) {
    porCliente.set(f.cliente, (porCliente.get(f.cliente) ?? 0) + Number(f.valor));
  }
  let maiorDevedor: MaiorDevedor | null = null;
  for (const [cliente, valor] of porCliente.entries()) {
    if (!maiorDevedor || valor > maiorDevedor.valor) maiorDevedor = { cliente, valor };
  }

  return {
    semAcao:          abertas.filter((f) => !idsComAcao.has(f.id)).length,
    comPromessa:      faturasScope.filter((f) => f.status === "promessa_pagamento").length,
    negociadas:       faturasScope.filter((f) => f.status === "negociada").length,
    juridico:         faturasScope.filter((f) => f.status === "juridico").length,
    protestadas:      faturasScope.filter((f) => f.status === "protestada").length,
    recebidas:        faturasScope.filter((f) => f.status === "recebida").length,
    totalAberto:      abertas.length,
    valorAberto:      abertas.reduce((s, f) => s + Number(f.valor), 0),
    faturasVencidas:  vencidas.length,
    valorRecebidoMes: recebidosNoMes.reduce((s, f) => s + Number(f.valor), 0),
    maiorDevedor,
  };
}
