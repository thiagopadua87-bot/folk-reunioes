import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const mes = searchParams.get("mes") ?? "";

    // Mês atual para fallback do histórico diário
    const mesAtual = mes || new Date().toISOString().slice(0, 7);

    // ── Executa todas as RPCs em paralelo ────────────────────────
    const [
      rpcMensal,
      rpcDiario,
      rpcAging,
      rpcTop10,
      rpcKpis,
    ] = await Promise.all([
      supabase.rpc("dashboard_historico_mensal"),
      supabase.rpc("dashboard_historico_diario", { p_mes: mesAtual }),
      supabase.rpc("dashboard_aging"),
      supabase.rpc("dashboard_top10_devedores"),
      // KPIs: query direta para manter flexibilidade de filtro por mês
      supabase
        .from("faturas")
        .select("id, status, valor, data_vencimento, updated_at, cliente, mes_referencia"),
    ]);

    if (rpcMensal.error)  throw new Error(`historico_mensal: ${rpcMensal.error.message}`);
    if (rpcDiario.error)  throw new Error(`historico_diario: ${rpcDiario.error.message}`);
    if (rpcAging.error)   throw new Error(`aging: ${rpcAging.error.message}`);
    if (rpcTop10.error)   throw new Error(`top10: ${rpcTop10.error.message}`);
    if (rpcKpis.error)    throw new Error(`kpis: ${rpcKpis.error.message}`);

    // ── KPIs calculados no backend ────────────────────────────────
    const hoje      = new Date().toISOString().slice(0, 10);
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().slice(0, 10);

    type FaturaRow = { id: string; status: string; valor: number; data_vencimento: string; updated_at: string; cliente: string; mes_referencia: string };
    let todas = (rpcKpis.data ?? []) as FaturaRow[];

    if (mes) todas = todas.filter((f) => f.mes_referencia === mes);

    const abertas  = todas.filter((f) => !["recebida", "cancelada"].includes(f.status));
    const vencidas = abertas.filter((f) => f.data_vencimento < hoje);

    // Ids com ação (para "sem ação")
    const { data: comAcao } = await supabase
      .from("inadimplencia_acoes")
      .select("fatura_id");
    const idsComAcao = new Set((comAcao ?? []).map((a: { fatura_id: string }) => a.fatura_id));

    // Recebido no mês corrente
    const recebidosMes = (rpcKpis.data as FaturaRow[]).filter(
      (f) => f.status === "recebida" && f.updated_at >= inicioMes,
    );

    // Maior devedor (já vem do top10, é o primeiro)
    const top10 = (rpcTop10.data ?? []) as { cliente: string; qtd: number; valor: number }[];

    const kpis = {
      totalAberto:      abertas.length,
      valorAberto:      abertas.reduce((s, f) => s + Number(f.valor), 0),
      faturasVencidas:  vencidas.length,
      semAcao:          abertas.filter((f) => !idsComAcao.has(f.id)).length,
      comPromessa:      todas.filter((f) => f.status === "promessa_pagamento").length,
      negociadas:       todas.filter((f) => f.status === "negociada").length,
      juridico:         todas.filter((f) => f.status === "juridico").length,
      protestadas:      todas.filter((f) => f.status === "protestada").length,
      recebidas:        todas.filter((f) => f.status === "recebida").length,
      valorRecebidoMes: recebidosMes.reduce((s, f) => s + Number(f.valor), 0),
      maiorDevedor:     top10[0] ? { cliente: top10[0].cliente, valor: Number(top10[0].valor) } : null,
    };

    // ── Meses disponíveis para o seletor ─────────────────────────
    const todosOsMeses = [...new Set(
      ((rpcKpis.data ?? []) as FaturaRow[]).map((f) => f.mes_referencia)
    )].sort().reverse();

    return NextResponse.json({
      kpis,
      historicoMensal: rpcMensal.data ?? [],
      historicoDiario: rpcDiario.data ?? [],
      aging:           rpcAging.data ?? [],
      top10,
      mesesDisponiveis: todosOsMeses,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
