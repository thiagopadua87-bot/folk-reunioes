import { supabase } from "@/lib/supabase";

// ── Fabricantes ───────────────────────────────────────────────

export interface Fabricante {
  id: string;
  nome: string;
  pais_origem: string;
  website: string;
  observacoes: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}
export type FabricantePayload = Omit<Fabricante, "id" | "created_at" | "updated_at">;

export async function listarFabricantes(filtros?: { busca?: string; ativo?: boolean }): Promise<Fabricante[]> {
  let q = supabase.from("ec_fabricantes").select("*").order("nome");
  if (filtros?.busca) q = q.ilike("nome", `%${filtros.busca}%`);
  if (filtros?.ativo !== undefined) q = q.eq("ativo", filtros.ativo);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as Fabricante[];
}
export async function criarFabricante(p: FabricantePayload) {
  const { error } = await supabase.from("ec_fabricantes").insert(p);
  if (error) throw new Error(error.message);
}
export async function editarFabricante(id: string, p: Partial<FabricantePayload>) {
  const { error } = await supabase.from("ec_fabricantes").update(p).eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Fornecedores ─────────────────────────────────────────────

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
  contato: string;
  email: string;
  telefone: string;
  observacoes: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}
export type FornecedorPayload = Omit<Fornecedor, "id" | "created_at" | "updated_at">;

export async function listarFornecedores(filtros?: { busca?: string; ativo?: boolean }): Promise<Fornecedor[]> {
  let q = supabase.from("ec_fornecedores").select("*").order("nome");
  if (filtros?.busca) q = q.ilike("nome", `%${filtros.busca}%`);
  if (filtros?.ativo !== undefined) q = q.eq("ativo", filtros.ativo);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as Fornecedor[];
}
export async function criarFornecedor(p: FornecedorPayload) {
  const { error } = await supabase.from("ec_fornecedores").insert(p);
  if (error) throw new Error(error.message);
}
export async function editarFornecedor(id: string, p: Partial<FornecedorPayload>) {
  const { error } = await supabase.from("ec_fornecedores").update(p).eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Categorias de Produto ─────────────────────────────────────

export interface CategoriaProduto {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
}
export type CategoriaProdutoPayload = Omit<CategoriaProduto, "id" | "created_at">;

export async function listarCategorias(filtros?: { busca?: string; ativo?: boolean }): Promise<CategoriaProduto[]> {
  let q = supabase.from("ec_categorias_produto").select("*").order("ordem").order("nome");
  if (filtros?.busca) q = q.ilike("nome", `%${filtros.busca}%`);
  if (filtros?.ativo !== undefined) q = q.eq("ativo", filtros.ativo);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as CategoriaProduto[];
}
export async function criarCategoria(p: CategoriaProdutoPayload) {
  const { error } = await supabase.from("ec_categorias_produto").insert(p);
  if (error) throw new Error(error.message);
}
export async function editarCategoria(id: string, p: Partial<CategoriaProdutoPayload>) {
  const { error } = await supabase.from("ec_categorias_produto").update(p).eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Catálogo de Itens ─────────────────────────────────────────

export interface ItemCatalogo {
  id: string;
  tipo: "produto" | "servico" | "licenca" | "assinatura";
  categoria_id: string;
  fabricante_id: string | null;
  codigo: string;
  nome: string;
  descricao: string;
  unidade: string;
  recorrente: boolean;
  dados_especificos: Record<string, unknown>;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // joined
  ec_categorias_produto?: { nome: string } | null;
  ec_fabricantes?: { nome: string } | null;
}
export type ItemCatalogoPayload = Omit<
  ItemCatalogo,
  "id" | "created_at" | "updated_at" | "ec_categorias_produto" | "ec_fabricantes"
>;

export async function listarItens(filtros?: {
  busca?: string;
  ativo?: boolean;
  tipo?: string;
  categoria_id?: string;
}): Promise<ItemCatalogo[]> {
  let q = supabase
    .from("ec_catalogo_itens")
    .select("*, ec_categorias_produto(nome), ec_fabricantes(nome)")
    .order("nome");
  if (filtros?.busca)       q = q.or(`nome.ilike.%${filtros.busca}%,codigo.ilike.%${filtros.busca}%`);
  if (filtros?.ativo !== undefined) q = q.eq("ativo", filtros.ativo);
  if (filtros?.tipo)        q = q.eq("tipo", filtros.tipo);
  if (filtros?.categoria_id) q = q.eq("categoria_id", filtros.categoria_id);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as ItemCatalogo[];
}
export async function criarItem(p: ItemCatalogoPayload) {
  const { error } = await supabase.from("ec_catalogo_itens").insert(p);
  if (error) throw new Error(error.message);
}
export async function editarItem(id: string, p: Partial<ItemCatalogoPayload>) {
  const { error } = await supabase.from("ec_catalogo_itens").update(p).eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Produto × Fornecedor ──────────────────────────────────────

export interface ProdutoFornecedor {
  id: string;
  item_id: string;
  fornecedor_id: string;
  codigo_fornecedor: string;
  ultimo_preco: number;
  data_ultimo_preco: string | null;
  prazo_entrega_dias: number;
  preferencial: boolean;
  observacoes: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  ec_fornecedores?: { nome: string } | null;
}
export type ProdutoFornecedorPayload = Omit<
  ProdutoFornecedor,
  "id" | "created_at" | "updated_at" | "ec_fornecedores"
>;

export async function listarPrecosPorItem(itemId: string): Promise<ProdutoFornecedor[]> {
  const { data, error } = await supabase
    .from("ec_produto_fornecedor")
    .select("*, ec_fornecedores(nome)")
    .eq("item_id", itemId)
    .order("preferencial", { ascending: false })
    .order("ultimo_preco");
  if (error) throw new Error(error.message);
  return data as ProdutoFornecedor[];
}
export async function upsertProdutoFornecedor(p: ProdutoFornecedorPayload) {
  const { error } = await supabase
    .from("ec_produto_fornecedor")
    .upsert(p, { onConflict: "item_id,fornecedor_id" });
  if (error) throw new Error(error.message);
}
export async function editarProdutoFornecedor(id: string, p: Partial<ProdutoFornecedorPayload>) {
  const { error } = await supabase.from("ec_produto_fornecedor").update(p).eq("id", id);
  if (error) throw new Error(error.message);
}
export async function excluirProdutoFornecedor(id: string) {
  const { error } = await supabase.from("ec_produto_fornecedor").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Kits ─────────────────────────────────────────────────────

export interface Kit {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  ativo: boolean;
  observacoes: string;
  created_at: string;
  updated_at: string;
}
export type KitPayload = Omit<Kit, "id" | "created_at" | "updated_at">;

export interface KitItem {
  id: string;
  kit_id: string;
  item_id: string;
  quantidade_base: number;
  fator_multiplicacao: string;
  observacoes: string;
  ordem: number;
  created_at: string;
  ec_catalogo_itens?: { nome: string; unidade: string; codigo: string } | null;
}
export type KitItemPayload = Omit<KitItem, "id" | "created_at" | "ec_catalogo_itens">;

export async function listarKits(filtros?: { busca?: string; ativo?: boolean; categoria?: string }): Promise<Kit[]> {
  let q = supabase.from("ec_kits").select("*").order("nome");
  if (filtros?.busca)     q = q.ilike("nome", `%${filtros.busca}%`);
  if (filtros?.ativo !== undefined) q = q.eq("ativo", filtros.ativo);
  if (filtros?.categoria) q = q.eq("categoria", filtros.categoria);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as Kit[];
}
export async function criarKit(p: KitPayload) {
  const { data, error } = await supabase.from("ec_kits").insert(p).select("id").single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}
export async function editarKit(id: string, p: Partial<KitPayload>) {
  const { error } = await supabase.from("ec_kits").update(p).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listarKitItens(kitId: string): Promise<KitItem[]> {
  const { data, error } = await supabase
    .from("ec_kit_itens")
    .select("*, ec_catalogo_itens(nome, unidade, codigo)")
    .eq("kit_id", kitId)
    .order("ordem");
  if (error) throw new Error(error.message);
  return data as KitItem[];
}
export async function criarKitItem(p: KitItemPayload) {
  const { error } = await supabase.from("ec_kit_itens").insert(p);
  if (error) throw new Error(error.message);
}
export async function editarKitItem(id: string, p: Partial<KitItemPayload>) {
  const { error } = await supabase.from("ec_kit_itens").update(p).eq("id", id);
  if (error) throw new Error(error.message);
}
export async function excluirKitItem(id: string) {
  const { error } = await supabase.from("ec_kit_itens").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Soluções ──────────────────────────────────────────────────

export interface Solucao {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  tecnologia: string;
  segmento: "basico" | "intermediario" | "premium" | "ultra";
  ativo: boolean;
  created_at: string;
  updated_at: string;
}
export type SolucaoPayload = Omit<Solucao, "id" | "created_at" | "updated_at">;

export interface SolucaoKit {
  id: string;
  solucao_id: string;
  kit_id: string;
  ordem: number;
  created_at: string;
  ec_kits?: { nome: string; categoria: string } | null;
}
export type SolucaoKitPayload = Omit<SolucaoKit, "id" | "created_at" | "ec_kits">;

export async function listarSolucoes(filtros?: {
  busca?: string;
  ativo?: boolean;
  categoria?: string;
}): Promise<Solucao[]> {
  let q = supabase.from("ec_solucoes").select("*").order("nome");
  if (filtros?.busca)     q = q.ilike("nome", `%${filtros.busca}%`);
  if (filtros?.ativo !== undefined) q = q.eq("ativo", filtros.ativo);
  if (filtros?.categoria) q = q.eq("categoria", filtros.categoria);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as Solucao[];
}
export async function criarSolucao(p: SolucaoPayload) {
  const { data, error } = await supabase.from("ec_solucoes").insert(p).select("id").single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}
export async function editarSolucao(id: string, p: Partial<SolucaoPayload>) {
  const { error } = await supabase.from("ec_solucoes").update(p).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listarSolucaoKits(solucaoId: string): Promise<SolucaoKit[]> {
  const { data, error } = await supabase
    .from("ec_solucao_kits")
    .select("*, ec_kits(nome, categoria)")
    .eq("solucao_id", solucaoId)
    .order("ordem");
  if (error) throw new Error(error.message);
  return data as SolucaoKit[];
}
export async function criarSolucaoKit(p: SolucaoKitPayload) {
  const { error } = await supabase.from("ec_solucao_kits").insert(p);
  if (error) throw new Error(error.message);
}
export async function excluirSolucaoKit(id: string) {
  const { error } = await supabase.from("ec_solucao_kits").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Regras de Composição ──────────────────────────────────────

export interface RegraComposicaoRow {
  id: string;
  kit_id: string | null;
  nome: string;
  descricao: string;
  condicao_campo: string;
  condicao_operador: ">" | "<" | ">=" | "<=" | "=" | "!=";
  condicao_valor: number;
  acao: "adicionar_produto" | "substituir_produto" | "adicionar_quantidade" | "remover_produto";
  produto_id: string | null;
  produto_substituido_id: string | null;
  quantidade: number;
  prioridade: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  ec_kits?: { nome: string } | null;
  produto?: { nome: string; codigo: string } | null;
  produto_substituido?: { nome: string; codigo: string } | null;
}
export type RegraComposicaoPayload = Omit<
  RegraComposicaoRow,
  "id" | "created_at" | "updated_at" | "ec_kits" | "produto" | "produto_substituido"
>;

export async function listarRegras(filtros?: {
  busca?: string;
  ativo?: boolean;
  kit_id?: string;
}): Promise<RegraComposicaoRow[]> {
  let q = supabase
    .from("ec_regras_composicao")
    .select(`
      *,
      ec_kits(nome),
      produto:produto_id(nome,codigo),
      produto_substituido:produto_substituido_id(nome,codigo)
    `)
    .order("prioridade")
    .order("nome");
  if (filtros?.busca)  q = q.ilike("nome", `%${filtros.busca}%`);
  if (filtros?.ativo !== undefined) q = q.eq("ativo", filtros.ativo);
  if (filtros?.kit_id) q = q.eq("kit_id", filtros.kit_id);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as RegraComposicaoRow[];
}
export async function criarRegra(p: RegraComposicaoPayload) {
  const { error } = await supabase.from("ec_regras_composicao").insert(p);
  if (error) throw new Error(error.message);
}
export async function editarRegra(id: string, p: Partial<RegraComposicaoPayload>) {
  const { error } = await supabase.from("ec_regras_composicao").update(p).eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Parâmetros Financeiros ────────────────────────────────────

export interface ParametroFinanceiro {
  id: string;
  chave: string;
  valor: number;
  descricao: string;
  categoria: string;
  unidade: string;
  ativo: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function listarParametros(filtros?: {
  categoria?: string;
  ativo?: boolean;
}): Promise<ParametroFinanceiro[]> {
  let q = supabase
    .from("ec_parametros_financeiros")
    .select("*")
    .order("categoria")
    .order("chave");
  if (filtros?.categoria) q = q.eq("categoria", filtros.categoria);
  if (filtros?.ativo !== undefined) q = q.eq("ativo", filtros.ativo);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as ParametroFinanceiro[];
}
export async function editarParametro(id: string, valor: number) {
  const { error } = await supabase
    .from("ec_parametros_financeiros")
    .update({ valor, updated_by: (await supabase.auth.getUser()).data.user?.id })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
