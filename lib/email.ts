export async function enviarEmail(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurada.");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Folk Reuniões <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Erro ao enviar email: ${body}`);
  }
}

export function emailCadastroCriado(nome: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="color:#E96A2B;margin-bottom:8px">Cadastro recebido!</h2>
      <p style="color:#374151">Olá, <strong>${nome}</strong>.</p>
      <p style="color:#374151">Seu cadastro no sistema <strong>Folk Reuniões</strong> foi realizado com sucesso e está aguardando aprovação do administrador.</p>
      <p style="color:#374151">Você receberá um novo email assim que seu acesso for liberado.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="color:#9ca3af;font-size:12px">Folk Reuniões — Sistema interno de gestão</p>
    </div>
  `;
}

export function emailCadastroAprovado(nome: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="color:#16a34a;margin-bottom:8px">Acesso aprovado!</h2>
      <p style="color:#374151">Olá, <strong>${nome}</strong>.</p>
      <p style="color:#374151">Seu acesso ao sistema <strong>Folk Reuniões</strong> foi aprovado pelo administrador.</p>
      <p style="color:#374151">Acesse agora:</p>
      <a href="https://folk-reunioes.vercel.app/login"
         style="display:inline-block;background:#E96A2B;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:8px">
        Entrar no sistema
      </a>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
      <p style="color:#9ca3af;font-size:12px">Folk Reuniões — Sistema interno de gestão</p>
    </div>
  `;
}
