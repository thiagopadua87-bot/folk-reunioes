import { supabase } from "./supabase";

// ── Tipos ────────────────────────────────────────────────────

export interface Vendedor {
  id: string;
  user_id: string;
  nome: string;
  telefone: string;
  email: string;
  ativo: boolean;
  created_at: string;
}

export interface Tecnico {
  id: string;
  user_id: string;
  nome: string;
  telefone: string;
  email: string;
  ativo: boolean;
  created_at: string;
}

export interface Terceirizado {
  id: string;
  user_id: string;
  cnpj: string;
  nome_empresa: string;
  contato: string;
  telefone: string;
  email: string;
  nome_responsavel: string;
  cpf_responsavel: string;
  ativo: boolean;
  created_at: string;
}

// ── CNPJ / CPF ───────────────────────────────────────────────

export function formatarCNPJ(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function validarCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  return digits.length === 11;
}

export function formatarCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// ── Vendedores ───────────────────────────────────────────────

export type VendedorPayload = Omit<Vendedor, "id" | "user_id" | "created_at">;

export interface FiltrosVendedores { busca?: string; ativo?: boolean | null }

export async function listarVendedores(filtros?: FiltrosVendedores): Promise<Vendedor[]> {
  let q = supabase.from("vendedores").select("*").order("nome");
  if (filtros?.ativo != null) q = q.eq("ativo", filtros.ativo);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const lista = (data ?? []) as Vendedor[];
  if (filtros?.busca) {
    const b = filtros.busca.toLowerCase();
    return lista.filter((v) => v.nome.toLowerCase().includes(b));
  }
  return lista;
}

export async function criarVendedor(payload: VendedorPayload): Promise<void> {
  const { error } = await supabase.from("vendedores").insert(payload);
  if (error) throw new Error(error.message);
}

export async function editarVendedor(id: string, payload: VendedorPayload): Promise<void> {
  const { error } = await supabase.from("vendedores").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Técnicos ─────────────────────────────────────────────────

export type TecnicoPayload = Omit<Tecnico, "id" | "user_id" | "created_at">;

export interface FiltrosTecnicos { busca?: string; ativo?: boolean | null }

export async function listarTecnicos(filtros?: FiltrosTecnicos): Promise<Tecnico[]> {
  let q = supabase.from("tecnicos").select("*").order("nome");
  if (filtros?.ativo != null) q = q.eq("ativo", filtros.ativo);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const lista = (data ?? []) as Tecnico[];
  if (filtros?.busca) {
    const b = filtros.busca.toLowerCase();
    return lista.filter((t) => t.nome.toLowerCase().includes(b));
  }
  return lista;
}

export async function criarTecnico(payload: TecnicoPayload): Promise<void> {
  const { error } = await supabase.from("tecnicos").insert(payload);
  if (error) throw new Error(error.message);
}

export async function editarTecnico(id: string, payload: TecnicoPayload): Promise<void> {
  const { error } = await supabase.from("tecnicos").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Terceirizados ─────────────────────────────────────────────

export type TerceirizadoPayload = Omit<Terceirizado, "id" | "user_id" | "created_at">;

export interface FiltrosTerceirizados { busca?: string; ativo?: boolean | null }

export async function listarTerceirizados(filtros?: FiltrosTerceirizados): Promise<Terceirizado[]> {
  let q = supabase.from("terceirizados").select("*").order("nome_empresa");
  if (filtros?.ativo != null) q = q.eq("ativo", filtros.ativo);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const lista = (data ?? []) as Terceirizado[];
  if (filtros?.busca) {
    const b = filtros.busca.toLowerCase();
    return lista.filter((t) => t.nome_empresa.toLowerCase().includes(b) || t.contato.toLowerCase().includes(b));
  }
  return lista;
}

export async function criarTerceirizado(payload: TerceirizadoPayload): Promise<void> {
  const { error } = await supabase.from("terceirizados").insert(payload);
  if (error) throw new Error(error.message);
}

export async function editarTerceirizado(id: string, payload: TerceirizadoPayload): Promise<void> {
  const { error } = await supabase.from("terceirizados").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}
