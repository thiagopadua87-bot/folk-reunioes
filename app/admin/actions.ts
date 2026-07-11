"use server";

import { createAdminSupabase } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";
import { enviarEmail, emailCadastroAprovado } from "@/lib/email";
import { revalidatePath } from "next/cache";
import type { UserStatus } from "@/lib/profiles";

async function assertAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Acesso negado.");
  return user.id;
}

async function registrarAudit(
  realizadoPorId: string,
  usuarioAlvoId: string,
  acao: string,
  detalhes: object = {},
) {
  try {
    const admin = createAdminSupabase();
    await admin.from("admin_audit_log").insert({
      realizado_por: realizadoPorId,
      usuario_alvo:  usuarioAlvoId,
      acao,
      detalhes,
    });
  } catch {
    // Audit log failures shouldn't block main operations
  }
}

export async function atualizarStatusUsuario(userId: string, status: UserStatus) {
  const adminId = await assertAdmin();

  const admin = createAdminSupabase();
  const { data: profile, error: errGet } = await admin
    .from("profiles")
    .select("nome, email, status")
    .eq("id", userId)
    .single();

  if (errGet) throw new Error(errGet.message);

  const { error } = await admin
    .from("profiles")
    .update({ status })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  const acaoMap: Record<UserStatus, string> = {
    aprovado: "usuario_aprovado",
    recusado: "usuario_recusado",
    pendente: "status_alterado_pendente",
  };
  await registrarAudit(adminId, userId, acaoMap[status], { statusAnterior: profile?.status });

  if (status === "aprovado" && profile?.status !== "aprovado") {
    enviarEmail(
      profile.email,
      "Acesso aprovado — Folk Reuniões",
      emailCadastroAprovado(profile.nome),
    ).catch(() => {});
  }

  revalidatePath("/admin");
}

export async function inativarUsuario(
  userId: string,
  motivo: string,
  dataDesligamento: string | null,
) {
  const adminId = await assertAdmin();

  const admin = createAdminSupabase();
  const { error } = await admin.from("profiles").update({
    ativo:             false,
    data_inativacao:   dataDesligamento || new Date().toISOString(),
    motivo_inativacao: motivo || null,
  }).eq("id", userId);

  if (error) throw new Error(error.message);

  // Banir no auth para revogar sessões
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });
  if (authError) throw new Error(authError.message);

  await registrarAudit(adminId, userId, "usuario_inativado", { motivo, dataDesligamento });
  revalidatePath("/admin");
}

export async function reativarUsuario(userId: string) {
  const adminId = await assertAdmin();

  const admin = createAdminSupabase();
  const { error } = await admin.from("profiles").update({
    ativo:             true,
    data_inativacao:   null,
    motivo_inativacao: null,
  }).eq("id", userId);

  if (error) throw new Error(error.message);

  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
  if (authError) throw new Error(authError.message);

  await registrarAudit(adminId, userId, "usuario_reativado", {});
  revalidatePath("/admin");
}

export async function atualizarPerfilUsuario(userId: string, perfilId: string | null) {
  const adminId = await assertAdmin();

  const admin = createAdminSupabase();
  const { error } = await admin.from("profiles").update({ perfil_id: perfilId }).eq("id", userId);
  if (error) throw new Error(error.message);

  await registrarAudit(adminId, userId, "perfil_alterado", { perfilId });
  revalidatePath("/admin");
}

export async function atualizarNomeUsuario(userId: string, nome: string) {
  const adminId = await assertAdmin();
  if (!nome.trim()) throw new Error("Nome é obrigatório.");

  const admin = createAdminSupabase();
  const { error } = await admin.from("profiles").update({ nome: nome.trim() }).eq("id", userId);
  if (error) throw new Error(error.message);

  await registrarAudit(adminId, userId, "nome_alterado", { nome });
  revalidatePath("/admin");
}

export async function gerarLinkConfirmacao(email: string): Promise<string> {
  await assertAdmin();

  const admin = createAdminSupabase();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password: "",
  });
  if (error) throw new Error(error.message);
  return data.properties.action_link;
}

export async function resetarSenha(userId: string, novaSenha: string) {
  const adminId = await assertAdmin();

  if (novaSenha.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");

  const admin = createAdminSupabase();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: novaSenha });
  if (error) throw new Error(error.message);

  await registrarAudit(adminId, userId, "senha_redefinida", {});
}
