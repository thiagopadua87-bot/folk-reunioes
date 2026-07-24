import { supabase } from "@/lib/supabase";
import { createVersion, calcularVersao as calcularVersaoEngine } from "./propostas";
import { validarVersaoParaCalculo } from "./validacao";

// ── Ciclo de vida da proposta ─────────────────────────────────

export async function criarProposta(payload: {
  pipelineId: string;
  nome: string;
  descricao: string;
}): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from("ec_propostas")
    .insert({
      pipeline_id: payload.pipelineId,
      nome:        payload.nome,
      descricao:   payload.descricao,
      created_by:  auth.user.id,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Erro ao criar proposta");
  const propostaId = (data as Record<string, unknown>).id as string;

  await createVersion(propostaId, "Versão inicial", {}, supabase);

  return propostaId;
}

export async function criarNovaVersao(
  propostaId: string,
  motivo: string,
  copiarDeVersaoId?: string
): Promise<void> {
  await createVersion(
    propostaId,
    motivo,
    copiarDeVersaoId ? { copiarDeVersaoId } : {},
    supabase
  );
}

export async function calcularEngenharia(versaoId: string): Promise<void> {
  // 1. Pré-validação na camada de domínio (evita motor com dados inválidos)
  const resultado = await validarVersaoParaCalculo(versaoId);
  if (!resultado.podeCalcular) {
    const msgs = resultado.bloqueantes.map((e) => e.mensagem).join(" | ");
    throw new Error(`Validação falhou antes do cálculo: ${msgs}`);
  }

  // 2. Executa o motor de engenharia
  await calcularVersaoEngine(versaoId, supabase);

  // 3. Limpa a flag de recálculo após sucesso
  await supabase
    .from("ec_versoes")
    .update({ necessita_recalculo: false })
    .eq("id", versaoId);
}
