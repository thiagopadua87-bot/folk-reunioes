/**
 * Template PDF Técnico — uso interno e clientes técnicos.
 * Inclui: escopo, necessidades, soluções, premissas, BOM, memorial, precificação detalhada.
 */

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import { base, FOLK, FOLK_LIGHT, GRAY_400, GRAY_600, GRAY_800, GRAY_100, WHITE } from "@/lib/pdf/styles";
import { BRL, PCT, NUM, DATA_CURTA, DATA_HORA } from "@/lib/pdf/formatters";
import { paybackMeses, formatPayback } from "@/lib/engenharia-comercial/kpi-utils";
import type { DadosTecnico } from "@/app/engenharia-comercial/pdf/loader";

// ── Estilos específicos ───────────────────────────────────────

const s = StyleSheet.create({
  capaBanda: {
    backgroundColor: FOLK,
    margin:          -44,
    marginBottom:    0,
    paddingHorizontal: 44,
    paddingVertical:   32,
    marginTop:         -44,
  },
  capaTitulo: {
    fontSize:    20,
    fontFamily:  "Helvetica-Bold",
    color:       WHITE,
    marginBottom: 6,
  },
  capaSubtitulo: {
    fontSize: 11,
    color:    "rgba(255,255,255,0.80)",
    marginBottom: 4,
  },
  capaMeta: {
    fontSize: 8.5,
    color:    "rgba(255,255,255,0.65)",
    marginTop: 14,
  },
  secaoBandinha: {
    backgroundColor: FOLK,
    paddingHorizontal: 6,
    paddingVertical:   3,
    borderRadius:      2,
    marginBottom:      8,
    marginTop:         14,
    alignSelf:         "flex-start",
  },
  secaoBandinhaTexto: {
    fontSize:   8.5,
    fontFamily: "Helvetica-Bold",
    color:      WHITE,
    letterSpacing: 0.3,
  },

  // Tabela BOM
  colCodigo:    { width: "11%"  },
  colNome:      { width: "28%"  },
  colCat:       { width: "11%"  },
  colFabr:      { width: "10%"  },
  colQtd:       { width: "6%",  textAlign: "right" },
  colUn:        { width: "5%"   },
  colCuUn:      { width: "12%", textAlign: "right" },
  colCuTotal:   { width: "12%", textAlign: "right" },
  colOrigem:    { width: "5%"   },

  // Premissas
  premissaLinha: {
    flexDirection:  "row",
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    alignItems:     "center",
  },
  premissaChave: {
    width:      "28%",
    fontSize:   7.5,
    fontFamily: "Courier",
    color:      GRAY_600,
  },
  premissaValor: {
    width:      "20%",
    fontSize:   8,
    fontFamily: "Helvetica-Bold",
    color:      GRAY_800,
    textAlign:  "right",
  },
  premissaDesc: {
    flex:    1,
    fontSize: 7.5,
    color:   GRAY_600,
    paddingLeft: 8,
  },

  // Etapas memorial financeiro
  etapaLinha: {
    flexDirection:  "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  etapaLinhaTotal: {
    flexDirection:  "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: FOLK_LIGHT,
    borderTopWidth:  1,
    borderTopColor:  FOLK,
  },
  etapaEtapa: {
    flex:    1,
    fontSize: 8,
    color:   GRAY_800,
  },
  etapaEtapaTotal: {
    flex:      1,
    fontSize:  8.5,
    fontFamily: "Helvetica-Bold",
    color:     FOLK,
  },
  etapaValor: {
    width:    "22%",
    fontSize:  8,
    color:    GRAY_800,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
  },
  etapaFormula: {
    width:    "30%",
    fontSize:  7,
    color:    GRAY_400,
    paddingLeft: 6,
    fontFamily: "Courier",
  },

  // Memorial de engenharia
  catBloco: {
    borderWidth:  1,
    borderColor:  FOLK_LIGHT,
    borderRadius: 3,
    marginBottom: 8,
    overflow:     "hidden",
  },
  catCabecalho: {
    flexDirection:   "row",
    backgroundColor: FOLK_LIGHT,
    paddingHorizontal: 8,
    paddingVertical:   5,
    alignItems:      "center",
    gap:             6,
  },
  catNome: {
    fontSize:   8.5,
    fontFamily: "Helvetica-Bold",
    color:      FOLK,
  },
  catSeta: {
    fontSize:  8,
    color:     GRAY_400,
  },
  catSolucao: {
    fontSize:   8.5,
    fontFamily: "Helvetica-Bold",
    color:      GRAY_800,
    flex:       1,
  },
  kitBloco: {
    paddingHorizontal: 8,
    paddingVertical:   4,
    backgroundColor:   "#F0F4FF",
  },
  kitNome: {
    fontSize:   7.5,
    fontFamily: "Helvetica-Bold",
    color:      "#3B4DA0",
    marginBottom: 3,
  },
  kitItem: {
    flexDirection: "row",
    gap:           4,
    marginBottom:  2,
    paddingLeft:   6,
  },
  kitItemBullet: {
    fontSize:  7,
    color:     GRAY_400,
    marginTop:  1,
  },
  kitItemTexto: {
    fontSize:  7.5,
    color:     GRAY_800,
    flex:      1,
  },
});

// ── Componentes auxiliares ────────────────────────────────────

function Cabecalho({ titulo, cliente, versao }: { titulo: string; cliente: string; versao: number }) {
  return (
    <View style={base.cabecalho} fixed>
      <View>
        <Text style={base.cabecalhoMarca}>folk</Text>
        <Text style={base.cabecalhoSub}>{titulo}</Text>
      </View>
      <View style={base.cabecalhoInfo}>
        <Text style={base.cabecalhoInfoLinha}>{cliente}</Text>
        <Text style={base.cabecalhoInfoLinha}>V{versao} · {DATA_CURTA(new Date().toISOString())}</Text>
      </View>
    </View>
  );
}

function Rodape({ cliente }: { cliente: string }) {
  return (
    <View style={base.rodape} fixed>
      <Text style={base.rodapeTexto}>Folk Tecnologia · Documento Técnico</Text>
      <Text style={base.rodapeTexto}>{cliente}</Text>
      <Text style={base.rodapeTexto} render={({ pageNumber, totalPages }) =>
        `${pageNumber} / ${totalPages}`
      } />
    </View>
  );
}

function SecaoTitulo({ children }: { children: string }) {
  return (
    <View style={s.secaoBandinha}>
      <Text style={s.secaoBandinhaTexto}>{children.toUpperCase()}</Text>
    </View>
  );
}

// ── Página de capa ────────────────────────────────────────────

function PaginaCapa({ dados }: { dados: DadosTecnico }) {
  return (
    <Page size="A4" style={base.page}>
      <View style={s.capaBanda}>
        <Text style={[{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 16, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 }]}>
          folk Tecnologia
        </Text>
        <Text style={s.capaTitulo}>{dados.proposta.nome}</Text>
        <Text style={s.capaSubtitulo}>{dados.proposta.cliente}</Text>
        <Text style={s.capaMeta}>
          Documento Técnico · Versão {dados.versao.numero} · Gerado em {DATA_HORA(new Date().toISOString())}
          {dados.proposta.responsavel ? ` · ${dados.proposta.responsavel}` : ""}
        </Text>
      </View>

      <View style={{ marginTop: 24, gap: 10 }}>
        {/* Índice */}
        <Text style={base.secaoTitulo}>Índice</Text>
        {[
          "1. Dados do Empreendimento",
          "2. Soluções Técnicas",
          "3. Lista de Materiais (BOM)",
          "4. Memorial de Engenharia",
          "5. Precificação Detalhada",
        ].map((item) => (
          <Text key={item} style={[base.paragrafo, { marginBottom: 2 }]}>
            {item}
          </Text>
        ))}
      </View>
    </Page>
  );
}

// ── Página 2: Escopo + Soluções ───────────────────────────────

function PaginaEscopo({ dados }: { dados: DadosTecnico }) {
  const pd = dados.projetoDados;
  return (
    <Page size="A4" style={base.page}>
      <Cabecalho titulo="Documento Técnico" cliente={dados.proposta.cliente} versao={dados.versao.numero} />

      <SecaoTitulo>1. Dados do Empreendimento</SecaoTitulo>
      {pd ? (
        <View style={base.camposGrid}>
          {pd.tipoCondominio && (
            <View style={base.campo}>
              <Text style={base.label}>Tipo</Text>
              <Text style={base.valor}>{pd.tipoCondominio}</Text>
            </View>
          )}
          {pd.numeroUnidades > 0 && (
            <View style={base.campo}>
              <Text style={base.label}>Unidades</Text>
              <Text style={base.valor}>{pd.numeroUnidades}</Text>
            </View>
          )}
          {pd.numeroPortarias > 0 && (
            <View style={base.campo}>
              <Text style={base.label}>Portarias</Text>
              <Text style={base.valor}>{pd.numeroPortarias}</Text>
            </View>
          )}
          {pd.numeroAcessos > 0 && (
            <View style={base.campo}>
              <Text style={base.label}>Acessos controlados</Text>
              <Text style={base.valor}>{pd.numeroAcessos}</Text>
            </View>
          )}
          {pd.numeroElevadores > 0 && (
            <View style={base.campo}>
              <Text style={base.label}>Elevadores</Text>
              <Text style={base.valor}>{pd.numeroElevadores}</Text>
            </View>
          )}
          {pd.areaTotal > 0 && (
            <View style={base.campo}>
              <Text style={base.label}>Área total</Text>
              <Text style={base.valor}>{pd.areaTotal} m²</Text>
            </View>
          )}
          {pd.observacoes && (
            <View style={{ width: "100%" }}>
              <Text style={base.label}>Observações</Text>
              <Text style={base.paragrafo}>{pd.observacoes}</Text>
            </View>
          )}
        </View>
      ) : (
        <Text style={base.paragrafo}>Dados do empreendimento não informados.</Text>
      )}

      <SecaoTitulo>2. Soluções Técnicas</SecaoTitulo>
      <View style={base.tabela}>
        <View style={base.tabelaCabecalho}>
          <Text style={[base.tabelaCabecalhoTexto, { width: "28%" }]}>Categoria</Text>
          <Text style={[base.tabelaCabecalhoTexto, { flex: 1 }]}>Solução</Text>
          <Text style={[base.tabelaCabecalhoTexto, { width: "18%" }]}>Segmento</Text>
        </View>
        {dados.solucoes.map((sol, i) => (
          <View key={i} style={i % 2 === 0 ? base.tabelaLinha : base.tabelaLinhaAlternada}>
            <Text style={[base.tabelaTexto, { width: "28%", fontFamily: "Helvetica-Bold" }]}>{sol.categoria}</Text>
            <Text style={[base.tabelaTexto, { flex: 1 }]}>{sol.solucaoNome}</Text>
            <Text style={[base.tabelaTextoMuted, { width: "18%" }]}>{sol.segmento || "—"}</Text>
          </View>
        ))}
      </View>

      <Rodape cliente={dados.proposta.cliente} />
    </Page>
  );
}

// ── Página 3: BOM ─────────────────────────────────────────────

function PaginaBom({ dados }: { dados: DadosTecnico }) {
  const total = dados.bom.reduce((s, i) => s + i.custoTotal, 0);

  return (
    <Page size="A4" style={[base.page, { paddingLeft: 24, paddingRight: 24 }]}>
      <Cabecalho titulo="Lista de Materiais (BOM)" cliente={dados.proposta.cliente} versao={dados.versao.numero} />

      <SecaoTitulo>3. Lista de Materiais</SecaoTitulo>
      <Text style={[base.paragrafo, { marginBottom: 8 }]}>
        {dados.bom.length} itens · Custo total: {BRL(total)}
      </Text>

      <View style={base.tabela}>
        {/* Cabeçalho */}
        <View style={[base.tabelaCabecalho, { paddingLeft: 4 }]}>
          <Text style={[base.tabelaCabecalhoTexto, s.colCodigo]}>Código</Text>
          <Text style={[base.tabelaCabecalhoTexto, s.colNome]}>Descrição</Text>
          <Text style={[base.tabelaCabecalhoTexto, s.colCat]}>Categoria</Text>
          <Text style={[base.tabelaCabecalhoTexto, s.colFabr]}>Fabricante</Text>
          <Text style={[base.tabelaCabecalhoTexto, s.colQtd, { textAlign: "right" }]}>Qtd</Text>
          <Text style={[base.tabelaCabecalhoTexto, s.colUn]}>Un</Text>
          <Text style={[base.tabelaCabecalhoTexto, s.colCuUn, { textAlign: "right" }]}>C. Unit.</Text>
          <Text style={[base.tabelaCabecalhoTexto, s.colCuTotal, { textAlign: "right" }]}>C. Total</Text>
          <Text style={[base.tabelaCabecalhoTexto, s.colOrigem]}>Orig.</Text>
        </View>

        {/* Linhas */}
        {dados.bom.map((item, i) => (
          <View key={item.id} style={i % 2 === 0 ? base.tabelaLinha : base.tabelaLinhaAlternada}>
            <Text style={[base.tabelaTextoMono, s.colCodigo]}>{item.codigo || "—"}</Text>
            <Text style={[base.tabelaTextoNegrito, s.colNome]} >{item.nome}</Text>
            <Text style={[base.tabelaTextoMuted, s.colCat]}>{item.categoria || "—"}</Text>
            <Text style={[base.tabelaTextoMuted, s.colFabr]}>{item.fabricante || "—"}</Text>
            <Text style={[base.tabelaTextoNegrito, s.colQtd, { textAlign: "right" }]}>{NUM(item.quantidade)}</Text>
            <Text style={[base.tabelaTextoMuted, s.colUn]}>{item.unidade}</Text>
            <Text style={[base.tabelaTexto, s.colCuUn, { textAlign: "right" }]}>{BRL(item.custoUnitario)}</Text>
            <Text style={[base.tabelaTextoNegrito, s.colCuTotal, { textAlign: "right" }]}>{BRL(item.custoTotal)}</Text>
            <Text style={[base.tabelaTextoMuted, s.colOrigem]}>{item.origem[0].toUpperCase()}</Text>
          </View>
        ))}

        {/* Total */}
        <View style={base.tabelaLinhaTotal}>
          <Text style={[base.tabelaTextoNegrito, { flex: 1 }]}>Total geral</Text>
          <Text style={[base.tabelaTextoFolk, s.colCuTotal, { textAlign: "right" }]}>{BRL(total)}</Text>
          <Text style={[base.tabelaTextoMuted, s.colOrigem]} />
        </View>
      </View>

      <Rodape cliente={dados.proposta.cliente} />
    </Page>
  );
}

// ── Página 4: Memorial de Engenharia ─────────────────────────

function PaginaMemorial({ dados }: { dados: DadosTecnico }) {
  const memorial = dados.memorial;

  return (
    <Page size="A4" style={base.page}>
      <Cabecalho titulo="Memorial de Engenharia" cliente={dados.proposta.cliente} versao={dados.versao.numero} />

      <SecaoTitulo>4. Memorial de Engenharia</SecaoTitulo>

      {memorial.categorias.map((cat) => (
        <View key={cat.categoria} style={s.catBloco}>
          <View style={s.catCabecalho}>
            <Text style={s.catNome}>{cat.categoria}</Text>
            <Text style={s.catSeta}>→</Text>
            <Text style={s.catSolucao}>{cat.solucaoNome}</Text>
          </View>

          {cat.kits.map((kit) => (
            <View key={kit.kitId} style={s.kitBloco}>
              <Text style={s.kitNome}>Kit: {kit.kitNome}</Text>
              {kit.itens.length === 0 ? (
                <Text style={[base.paragrafo, { fontSize: 7, marginBottom: 0 }]}>
                  Sem itens no BOM para este kit.
                </Text>
              ) : (
                kit.itens.map((item) => (
                  <View key={item.itemId} style={s.kitItem}>
                    <Text style={s.kitItemBullet}>•</Text>
                    <Text style={s.kitItemTexto}>
                      {NUM(item.quantidade)} {item.unidade} × {item.nome}
                      {item.codigo ? ` (${item.codigo})` : ""}
                    </Text>
                  </View>
                ))
              )}
            </View>
          ))}
        </View>
      ))}

      {memorial.regras.length > 0 && (
        <>
          <Text style={[base.secaoTitulo, { marginTop: 12 }]}>Regras de composição aplicadas</Text>
          {memorial.regras.map((regra) => (
            <View key={regra.regraName} style={s.catBloco}>
              <View style={[s.catCabecalho, { backgroundColor: "#F0E8FF" }]}>
                <Text style={[s.catNome, { color: "#6B21A8" }]}>Regra: {regra.regraName}</Text>
              </View>
              <View style={[s.kitBloco, { backgroundColor: "#FAF5FF" }]}>
                {regra.itens.map((item) => (
                  <View key={item.itemId} style={s.kitItem}>
                    <Text style={s.kitItemBullet}>•</Text>
                    <Text style={s.kitItemTexto}>
                      {NUM(item.quantidade)} {item.unidade} × {item.nome}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </>
      )}

      <Rodape cliente={dados.proposta.cliente} />
    </Page>
  );
}

// ── Página 5: Precificação Detalhada ─────────────────────────

const ETAPAS_TOTAIS = new Set([
  "= Valor de implantação",
  "= Custo mensal total",
  "= Valor mensal",
]);

function PaginaPrecificacao({ dados }: { dados: DadosTecnico }) {
  const prec = dados.prec;
  if (!prec) return null;

  const margemOk = prec.margemAplicada >= prec.margemMinima;
  const lucroMensal = prec.valorMensal - prec.custoMensalOperacional - prec.custoMensalAdicional;
  const payback  = formatPayback(paybackMeses(prec.valorImplantacao, lucroMensal));

  return (
    <Page size="A4" style={base.page}>
      <Cabecalho titulo="Precificação" cliente={dados.proposta.cliente} versao={dados.versao.numero} />

      <SecaoTitulo>5. Precificação Detalhada</SecaoTitulo>

      {/* Alerta de margem */}
      {!margemOk && (
        <View style={base.alerta}>
          <Text style={base.alertaTexto}>
            ⚠ Margem calculada ({PCT(prec.margemAplicada)}) abaixo da margem mínima ({PCT(prec.margemMinima)}).
            Esta proposta requer aprovação da gerência antes do envio ao cliente.
          </Text>
        </View>
      )}

      {/* KPIs */}
      <View style={base.kpiGrid}>
        <View style={base.kpiCardDestaque}>
          <Text style={base.kpiLabel}>Valor de Implantação</Text>
          <Text style={base.kpiValorFolk}>{BRL(prec.valorImplantacao)}</Text>
        </View>
        <View style={base.kpiCard}>
          <Text style={base.kpiLabel}>Mensalidade</Text>
          <Text style={base.kpiValor}>{BRL(prec.valorMensal)}</Text>
        </View>
        <View style={base.kpiCard}>
          <Text style={base.kpiLabel}>Margem</Text>
          <Text style={[base.kpiValor, { color: margemOk ? GRAY_800 : "#DC2626" }]}>
            {PCT(prec.margemAplicada)}
          </Text>
        </View>
        <View style={base.kpiCard}>
          <Text style={base.kpiLabel}>Payback</Text>
          <Text style={base.kpiValor}>{payback}</Text>
        </View>
      </View>

      {/* Memorial de cálculo */}
      <Text style={[base.secaoTitulo, { marginTop: 4 }]}>Memorial de Cálculo</Text>
      <Text style={[base.paragrafo, { marginBottom: 8 }]}>
        Calculado em {DATA_HORA(prec.calculatedAt)}
      </Text>

      <View style={base.tabela}>
        <View style={base.tabelaCabecalho}>
          <Text style={[base.tabelaCabecalhoTexto, { flex: 1 }]}>Etapa</Text>
          <Text style={[base.tabelaCabecalhoTexto, { width: "22%", textAlign: "right" }]}>Valor</Text>
          <Text style={[base.tabelaCabecalhoTexto, { width: "30%" }]}>Fórmula / Nota</Text>
        </View>
        {prec.etapas.map((etapa, i) => {
          const isTotal = ETAPAS_TOTAIS.has(etapa.etapa);
          return (
            <View key={i} style={isTotal ? s.etapaLinhaTotal : s.etapaLinha}>
              <Text style={isTotal ? s.etapaEtapaTotal : s.etapaEtapa}>{etapa.etapa}</Text>
              <Text style={[s.etapaValor, isTotal ? { color: FOLK } : {}]}>
                {etapa.valor !== 0 ? BRL(etapa.valor) : "—"}
              </Text>
              <Text style={s.etapaFormula}>{etapa.formula ?? ""}</Text>
            </View>
          );
        })}
      </View>

      {/* Parâmetros */}
      {Object.keys(prec.parametrosUtilizados).length > 0 && (
        <>
          <Text style={base.secaoTitulo}>Parâmetros Utilizados</Text>
          <View style={base.kpiGrid}>
            {Object.entries(prec.parametrosUtilizados).map(([k, v]) => (
              <View key={k} style={base.kpiCard}>
                <Text style={base.kpiLabel}>{k.replace(/_/g, " ")}</Text>
                <Text style={base.kpiValor}>
                  {k.includes("percentual") ? PCT(v) : BRL(v)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Rodape cliente={dados.proposta.cliente} />
    </Page>
  );
}

// ── Documento principal ───────────────────────────────────────

export function TecnicoPdf({ dados }: { dados: DadosTecnico }) {
  return (
    <Document
      title={`Documento Técnico — ${dados.proposta.nome}`}
      author="Folk Tecnologia"
      subject="Proposta Técnica"
      creator="Folk EC Module"
    >
      <PaginaCapa dados={dados} />
      <PaginaEscopo dados={dados} />
      {dados.bom.length > 0 && <PaginaBom dados={dados} />}
      {dados.memorial.categorias.length > 0 && <PaginaMemorial dados={dados} />}
      {dados.prec && <PaginaPrecificacao dados={dados} />}
    </Document>
  );
}
