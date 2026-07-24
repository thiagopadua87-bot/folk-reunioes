/**
 * GET /api/ec/propostas/pdf?versaoId=...&tipo=executivo|tecnico
 *
 * Gera e retorna o PDF da proposta em formato binário.
 * Usa @react-pdf/renderer renderToBuffer — roda exclusivamente no servidor.
 */

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer }    from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { carregarDadosExecutivo, carregarDadosTecnico } from "@/app/engenharia-comercial/pdf/loader";
import { ExecutivoPdf }  from "@/app/engenharia-comercial/pdf/templates/executivo";
import { TecnicoPdf }    from "@/app/engenharia-comercial/pdf/templates/tecnico";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const versaoId = req.nextUrl.searchParams.get("versaoId");
  const tipo     = req.nextUrl.searchParams.get("tipo") ?? "executivo";

  if (!versaoId || !UUID_RE.test(versaoId)) {
    return NextResponse.json({ error: "versaoId inválido" }, { status: 400 });
  }

  if (tipo !== "executivo" && tipo !== "tecnico") {
    return NextResponse.json({ error: 'tipo deve ser "executivo" ou "tecnico"' }, { status: 400 });
  }

  const supabaseServer = await createServerSupabase();
  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    let buffer: Buffer;
    let filename: string;

    if (tipo === "executivo") {
      const dados = await carregarDadosExecutivo(versaoId, supabaseServer);
      const doc   = <ExecutivoPdf dados={dados} /> as unknown as ReactElement<DocumentProps>;
      buffer      = await renderToBuffer(doc);
      filename    = `proposta-executiva-v${dados.versao.numero}.pdf`;
    } else {
      const dados = await carregarDadosTecnico(versaoId, supabaseServer);
      const doc   = <TecnicoPdf dados={dados} /> as unknown as ReactElement<DocumentProps>;
      buffer      = await renderToBuffer(doc);
      filename    = `proposta-tecnica-v${dados.versao.numero}.pdf`;
    }

    const bytes = new Uint8Array(buffer);

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length":      String(bytes.length),
        "Cache-Control":       "no-store",
      },
    });
  } catch (e) {
    const msg = (e as Error).message ?? "Erro interno ao gerar PDF.";
    console.error("[pdf/route]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
