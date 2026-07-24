/**
 * Template PDF Executivo — voltado ao cliente.
 * Conteúdo: capa, dados do condomínio, resumo da solução, valores comerciais.
 * SEM BOM, SEM memorial, SEM regras internas.
 */

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import { base, FOLK, FOLK_LIGHT, GRAY_400, GRAY_600, GRAY_800, WHITE } from "@/lib/pdf/styles";
import { BRL, PCT, DATA_CURTA } from "@/lib/pdf/formatters";
import { paybackMeses, formatPayback } from "@/lib/engenharia-comercial/kpi-utils";
import type { DadosComuns } from "@/app/engenharia-comercial/pdf/loader";

// ── Estilos específicos deste template ───────────────────────

const s = StyleSheet.create({
  // Capa
  capa: {
    flex:             1,
    justifyContent:   "center",
    alignItems:       "center",
    backgroundColor:  FOLK,
    margin:           -44,
    padding:          60,
  },
  capaMarca: {
    fontSize:    32,
    fontFamily:  "Helvetica-Bold",
    color:       WHITE,
    letterSpacing: 1,
    marginBottom: 8,
  },
  capaMarcaSub: {
    fontSize:  12,
    color:     "rgba(255,255,255,0.75)",
    marginBottom: 48,
    letterSpacing: 0.5,
  },
  capaTitulo: {
    fontSize:   20,
    fontFamily: "Helvetica-Bold",
    color:      WHITE,
    textAlign:  "center",
    lineHeight: 1.3,
    marginBottom: 10,
  },
  capaCliente: {
    fontSize:  11,
    color:     "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginBottom: 48,
  },
  capaDataBox: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius:    4,
    paddingHorizontal: 20,
    paddingVertical:   10,
  },
  capaDataTexto: {
    fontSize:  9,
    color:     "rgba(255,255,255,0.80)",
    textAlign: "center",
  },

  // Grid de info
  infoGrid: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           16,
    marginBottom:  16,
  },
  infoItem: {
    minWidth: 120,
    flex:     1,
  },
  infoLabel: {
    fontSize:    7,
    color:       GRAY_400,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  infoValor: {
    fontSize:   9,
    fontFamily: "Helvetica-Bold",
    color:      GRAY_800,
  },

  // Linha de solução
  solucaoLinha: {
    flexDirection:  "row",
    alignItems:     "flex-start",
    gap:            8,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  solucaoBadge: {
    backgroundColor: FOLK_LIGHT,
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      3,
    minWidth:          70,
  },
  solucaoBadgeTexto: {
    fontSize:   7,
    color:      FOLK,
    fontFamily: "Helvetica-Bold",
  },
  solucaoNome: {
    fontSize:  8.5,
    color:     GRAY_800,
    flex:      1,
    fontFamily: "Helvetica-Bold",
  },
  solucaoSeg: {
    fontSize: 7.5,
    color:    GRAY_600,
  },
});

// ── Componentes auxiliares ────────────────────────────────────

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={s.infoItem}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValor}>{valor || "—"}</Text>
    </View>
  );
}

function Rodape({ cliente }: { cliente: string }) {
  return (
    <View style={base.rodape} fixed>
      <Text style={base.rodapeTexto}>
        Folk Tecnologia · Proposta comercial confidencial
      </Text>
      <Text style={base.rodapeTexto}>{cliente}</Text>
      <Text style={base.rodapeTexto} render={({ pageNumber, totalPages }) =>
        `Página ${pageNumber} de ${totalPages}`
      } />
    </View>
  );
}

// ── Seções ────────────────────────────────────────────────────

function Capa({ dados }: { dados: DadosComuns }) {
  return (
    <Page size="A4" style={base.page}>
      <View style={s.capa}>
        <Text style={s.capaMarca}>folk</Text>
        <Text style={s.capaMarcaSub}>Tecnologia</Text>

        <Text style={s.capaTitulo}>{dados.proposta.nome}</Text>
        <Text style={s.capaCliente}>{dados.proposta.cliente}</Text>

        <View style={s.capaDataBox}>
          <Text style={s.capaDataTexto}>
            Versão {dados.versao.numero} · {DATA_CURTA(new Date().toISOString())}
          </Text>
          {dados.proposta.responsavel && (
            <Text style={[s.capaDataTexto, { marginTop: 3 }]}>
              Responsável: {dados.proposta.responsavel}
            </Text>
          )}
        </View>
      </View>
    </Page>
  );
}

function ResumoExecutivo({ dados }: { dados: DadosComuns }) {
  const kpis   = dados.kpis;
  const pd     = dados.projetoDados;
  const payback = kpis ? formatPayback(paybackMeses(kpis.valorImplantacao ?? 0, kpis.lucroMensal ?? 0)) : "—";

  return (
    <Page size="A4" style={base.page}>
      {/* Cabeçalho */}
      <View style={base.cabecalho}>
        <View>
          <Text style={base.cabecalhoMarca}>folk</Text>
          <Text style={base.cabecalhoSub}>Proposta Executiva</Text>
        </View>
        <View style={base.cabecalhoInfo}>
          <Text style={base.cabecalhoInfoLinha}>{dados.proposta.cliente}</Text>
          <Text style={base.cabecalhoInfoLinha}>V{dados.versao.numero} · {DATA_CURTA(new Date().toISOString())}</Text>
        </View>
      </View>

      {/* KPIs */}
      <Text style={base.secaoTitulo}>Resumo Financeiro</Text>
      <View style={base.kpiGrid}>
        <View style={base.kpiCardDestaque}>
          <Text style={base.kpiLabel}>Valor de Implantação</Text>
          <Text style={base.kpiValorFolk}>
            {kpis?.valorImplantacao ? BRL(kpis.valorImplantacao) : "—"}
          </Text>
        </View>
        <View style={base.kpiCard}>
          <Text style={base.kpiLabel}>Mensalidade</Text>
          <Text style={base.kpiValor}>
            {kpis?.valorMensal ? BRL(kpis.valorMensal) : "—"}
          </Text>
        </View>
        <View style={base.kpiCard}>
          <Text style={base.kpiLabel}>Margem</Text>
          <Text style={base.kpiValor}>
            {kpis?.margemPct ? PCT(kpis.margemPct) : "—"}
          </Text>
        </View>
        <View style={base.kpiCard}>
          <Text style={base.kpiLabel}>Payback estimado</Text>
          <Text style={base.kpiValor}>{payback}</Text>
        </View>
      </View>

      {/* Dados do condomínio */}
      {pd && (
        <>
          <Text style={base.secaoTitulo}>Dados do Empreendimento</Text>
          <View style={s.infoGrid}>
            {pd.tipoCondominio && <Campo label="Tipo" valor={pd.tipoCondominio} />}
            {pd.numeroUnidades > 0 && <Campo label="Unidades" valor={String(pd.numeroUnidades)} />}
            {pd.numeroPortarias > 0 && <Campo label="Portarias" valor={String(pd.numeroPortarias)} />}
            {pd.numeroAcessos > 0 && <Campo label="Acessos" valor={String(pd.numeroAcessos)} />}
            {pd.numeroElevadores > 0 && <Campo label="Elevadores" valor={String(pd.numeroElevadores)} />}
            {pd.areaTotal > 0 && <Campo label="Área total" valor={`${pd.areaTotal} m²`} />}
          </View>
          {pd.observacoes && (
            <Text style={base.paragrafo}>{pd.observacoes}</Text>
          )}
        </>
      )}

      {/* Soluções */}
      {dados.solucoes.length > 0 && (
        <>
          <Text style={base.secaoTitulo}>Soluções Propostas</Text>
          <View style={base.tabela}>
            {dados.solucoes.map((sol, i) => (
              <View key={i} style={s.solucaoLinha}>
                <View style={s.solucaoBadge}>
                  <Text style={s.solucaoBadgeTexto}>{sol.categoria}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.solucaoNome}>{sol.solucaoNome}</Text>
                  {sol.segmento && <Text style={s.solucaoSeg}>{sol.segmento}</Text>}
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Condições comerciais */}
      <Text style={base.secaoTitulo}>Condições Comerciais</Text>
      <View style={s.infoGrid}>
        <Campo label="Valor de implantação" valor={kpis?.valorImplantacao ? BRL(kpis.valorImplantacao) : "A calcular"} />
        <Campo label="Mensalidade" valor={kpis?.valorMensal ? BRL(kpis.valorMensal) : "A calcular"} />
        <Campo label="Payback" valor={payback} />
      </View>

      <Text style={[base.paragrafo, { marginTop: 8, color: "#6B7280", fontSize: 7.5 }]}>
        * Os valores acima são válidos por 30 dias a partir da data desta proposta e estão sujeitos à aprovação
        técnica e financeira da Folk Tecnologia. Impostos incluídos conforme legislação vigente.
      </Text>

      <Rodape cliente={dados.proposta.cliente} />
    </Page>
  );
}

// ── Documento principal ───────────────────────────────────────

export function ExecutivoPdf({ dados }: { dados: DadosComuns }) {
  return (
    <Document
      title={`Proposta Executiva — ${dados.proposta.nome}`}
      author="Folk Tecnologia"
      subject="Proposta Comercial"
      creator="Folk EC Module"
    >
      <Capa dados={dados} />
      <ResumoExecutivo dados={dados} />
    </Document>
  );
}
