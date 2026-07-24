/**
 * GET /api/ec/propostas/excel?versaoId=...
 *
 * Gera e retorna a Lista de Materiais (BOM) em formato Excel (.xlsx).
 * Usa a biblioteca xlsx (SheetJS) — roda exclusivamente no servidor.
 */

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { listarBom }             from "@/lib/engenharia-comercial/engenharia-db";
import { buscarPrecificacao }    from "@/lib/engenharia-comercial/engenharia-db";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BRL_NUM = (v: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

export async function GET(req: NextRequest) {
  const versaoId = req.nextUrl.searchParams.get("versaoId");
  if (!versaoId || !UUID_RE.test(versaoId)) {
    return NextResponse.json({ error: "versaoId inválido" }, { status: 400 });
  }

  const supabaseServer = await createServerSupabase();
  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  async function buscarNomeProposta(): Promise<{ proposta: string; versao: number } | null> {
    const { data } = await supabaseServer
      .from("ec_versoes")
      .select("numero, ec_propostas(nome)")
      .eq("id", versaoId!)
      .maybeSingle();
    if (!data) return null;
    const d = data as Record<string, unknown>;
    const p = d.ec_propostas as Record<string, string> | null;
    return { proposta: p?.nome ?? "proposta", versao: d.numero as number };
  }

  try {
    const [bom, prec, meta] = await Promise.all([
      listarBom(versaoId, supabaseServer),
      buscarPrecificacao(versaoId, supabaseServer),
      buscarNomeProposta(),
    ]);

    const wb = XLSX.utils.book_new();

    // ── Aba BOM ─────────────────────────────────────────────
    const bomRows = [
      ["Código", "Descrição", "Categoria", "Fabricante", "Fornecedor", "Qtd", "Un", "Custo Unit.", "Custo Total", "Origem", "Kit/Regra"],
      ...bom.map((i) => [
        i.codigo,
        i.nome,
        i.categoria,
        i.fabricante,
        i.fornecedorNome,
        i.quantidade,
        i.unidade,
        i.custoUnitario,
        i.custoTotal,
        i.origem,
        i.origemNome,
      ]),
      [],
      ["", "", "", "", "", "", "", "TOTAL GERAL", bom.reduce((s, i) => s + i.custoTotal, 0)],
    ];

    const wsBom = XLSX.utils.aoa_to_sheet(bomRows);

    // Formata colunas de valores como moeda
    const range = XLSX.utils.decode_range(wsBom["!ref"] ?? "A1");
    for (let R = 1; R <= range.e.r; R++) {
      const cuUn    = XLSX.utils.encode_cell({ r: R, c: 7 });
      const cuTotal = XLSX.utils.encode_cell({ r: R, c: 8 });
      if (wsBom[cuUn]?.t === "n")    wsBom[cuUn].z    = "#.##0,00";
      if (wsBom[cuTotal]?.t === "n") wsBom[cuTotal].z = "#.##0,00";
    }

    wsBom["!cols"] = [
      { wch: 12 }, { wch: 40 }, { wch: 16 }, { wch: 18 }, { wch: 22 },
      { wch: 7  }, { wch: 5  }, { wch: 14 }, { wch: 14 }, { wch: 8  }, { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(wb, wsBom, "Lista de Materiais");

    // ── Aba Precificação (se disponível) ──────────────────────
    if (prec) {
      const precRows = [
        ["Resumo Financeiro", ""],
        [],
        ["Item", "Valor"],
        ["Custo de materiais",      prec.custoTotalMateriais    ],
        ["Mão de obra (instalação)", prec.custoInstalacao       ],
        ["Outros custos únicos",    prec.custoOutrosUnicos      ],
        ["BDI aplicado",            prec.bdiAplicado            ],
        ["Impostos",                prec.impostosAplicados      ],
        ["VALOR DE IMPLANTAÇÃO",    prec.valorImplantacao       ],
        [],
        ["Custo mensal operacional", prec.custoMensalOperacional],
        ["Custo mensal adicional",  prec.custoMensalAdicional   ],
        ["MENSALIDADE",             prec.valorMensal            ],
        [],
        ["Margem aplicada (%)",     prec.margemAplicada         ],
        ["Margem mínima (%)",       prec.margemMinima           ],
        ["Aprovação necessária",    prec.requiresApproval ? "Sim" : "Não"],
        [],
        ["Calculado em", prec.calculatedAt],
      ];

      const wsPrec = XLSX.utils.aoa_to_sheet(precRows);
      wsPrec["!cols"] = [{ wch: 30 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, wsPrec, "Precificação");
    }

    // ── Aba Parâmetros ────────────────────────────────────────
    if (prec && Object.keys(prec.parametrosUtilizados).length > 0) {
      const paramRows = [
        ["Parâmetro", "Valor"],
        ...Object.entries(prec.parametrosUtilizados).map(([k, v]) => [
          k.replace(/_/g, " "),
          v,
        ]),
      ];
      const wsParam = XLSX.utils.aoa_to_sheet(paramRows);
      wsParam["!cols"] = [{ wch: 40 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, wsParam, "Parâmetros");
    }

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
    const excelBytes  = new Uint8Array(excelBuffer);
    const propostaNome = meta?.proposta ?? "proposta";
    const versaoNum    = meta?.versao   ?? 1;
    const filename     = `BOM-${propostaNome.replace(/\s+/g, "-")}-V${versaoNum}.xlsx`;

    return new NextResponse(excelBytes, {
      status: 200,
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length":      String(excelBytes.length),
        "Cache-Control":       "no-store",
      },
    });
  } catch (e) {
    const msg = (e as Error).message ?? "Erro interno ao gerar Excel.";
    console.error("[excel/route]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
