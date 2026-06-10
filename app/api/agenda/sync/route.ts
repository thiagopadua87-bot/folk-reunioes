import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { criarOuAtualizarEvento, excluirEvento } from "@/lib/google-calendar";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { pipeline_id, action } = await req.json() as {
      pipeline_id: string;
      action: "sync" | "delete";
    };

    // Busca o item do pipeline com dados do vendedor
    const { data: item, error: errItem } = await supabase
      .from("pipeline")
      .select("*, vendedores!vendedor_id(nome, email, google_calendar_id)")
      .eq("id", pipeline_id)
      .single();

    if (errItem || !item) {
      return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
    }

    // Excluir evento existente
    if (action === "delete") {
      if (item.google_event_id && item.vendedores?.google_calendar_id) {
        await excluirEvento(item.vendedores.google_calendar_id, item.google_event_id);
      }
      await supabase.from("pipeline").update({
        google_event_id:    null,
        google_sync_status: "nao_sincronizado",
      }).eq("id", pipeline_id);
      return NextResponse.json({ ok: true });
    }

    // Validações para sync
    if (!item.proxima_acao_datahora) {
      return NextResponse.json({ error: "Defina a data da próxima ação antes de sincronizar." }, { status: 400 });
    }

    const calendarId = item.vendedores?.google_calendar_id;
    if (!calendarId) {
      return NextResponse.json({ error: "Vendedor sem Google Calendar configurado. Solicite ao administrador vincular o Calendar ID." }, { status: 400 });
    }

    const tipo     = item.proxima_acao_tipo || "Ação";
    const titulo   = `${tipo} — ${item.cliente}`;
    const descricao = [
      item.proxima_acao_descricao,
      `Status: ${item.status}`,
      item.indicado_por ? `Indicado por: ${item.indicado_por}` : "",
      item.observacoes  ? `Obs: ${item.observacoes}` : "",
    ].filter(Boolean).join("\n");

    const eventId = await criarOuAtualizarEvento({
      calendarId,
      eventId:    item.google_event_id ?? undefined,
      titulo,
      descricao,
      inicio:     item.proxima_acao_datahora,
    });

    await supabase.from("pipeline").update({
      google_event_id:    eventId,
      google_sync_status: "sincronizado",
      ultima_interacao:   new Date().toISOString(),
    }).eq("id", pipeline_id);

    // Registra no crm_agenda_sync
    await supabase.from("crm_agenda_sync").upsert({
      proposta_id: pipeline_id,
      vendedor_id: item.vendedor_id,
      status:      "sincronizado",
    }, { onConflict: "proposta_id" });

    return NextResponse.json({ ok: true, eventId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
