"use server";

import { enviarEmail, emailCadastroCriado } from "@/lib/email";

export async function notificarCadastroCriado(nome: string, email: string): Promise<void> {
  await enviarEmail(email, "Cadastro recebido — Folk Reuniões", emailCadastroCriado(nome));
}
