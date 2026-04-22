"use server";

import { createAdminSupabase } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";
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
}

export async function atualizarStatusUsuario(userId: string, status: UserStatus) {
  await assertAdmin();

  const admin = createAdminSupabase();
  const { error } = await admin
    .from("profiles")
    .update({ status })
    .eq("id", userId);

  if (error) throw new Error(error.message);

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
  await assertAdmin();

  if (novaSenha.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");

  const admin = createAdminSupabase();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: novaSenha });
  if (error) throw new Error(error.message);
}
