import { StyleSheet } from "@react-pdf/renderer";

// ── Paleta folk ──────────────────────────────────────────────
export const FOLK        = "#F05A28";
export const FOLK_LIGHT  = "#FDE8DF";
export const FOLK_DARK   = "#C04015";

export const GRAY_50  = "#F9FAFB";
export const GRAY_100 = "#F3F4F6";
export const GRAY_200 = "#E5E7EB";
export const GRAY_400 = "#9CA3AF";
export const GRAY_600 = "#4B5563";
export const GRAY_800 = "#1F2937";
export const GRAY_900 = "#111827";
export const WHITE     = "#FFFFFF";

// ── Estilos base compartilhados ──────────────────────────────
export const base = StyleSheet.create({
  page: {
    fontFamily:      "Helvetica",
    fontSize:        9,
    color:           GRAY_900,
    paddingTop:      44,
    paddingBottom:   52,
    paddingLeft:     44,
    paddingRight:    44,
    backgroundColor: WHITE,
  },

  // Cabeçalho do documento
  cabecalho: {
    flexDirection:   "row",
    justifyContent:  "space-between",
    alignItems:      "flex-start",
    marginBottom:    24,
    paddingBottom:   12,
    borderBottomWidth: 2,
    borderBottomColor: FOLK,
  },
  cabecalhoMarca: {
    fontSize:   18,
    fontFamily: "Helvetica-Bold",
    color:      FOLK,
    letterSpacing: 0.5,
  },
  cabecalhoSub: {
    fontSize: 8,
    color:    GRAY_400,
    marginTop: 2,
  },
  cabecalhoInfo: {
    alignItems: "flex-end",
  },
  cabecalhoInfoLinha: {
    fontSize: 7.5,
    color:    GRAY_600,
  },

  // Rodapé
  rodape: {
    position:    "absolute",
    bottom:      20,
    left:        44,
    right:       44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems:  "center",
    paddingTop:  6,
    borderTopWidth: 0.5,
    borderTopColor: GRAY_200,
  },
  rodapeTexto: {
    fontSize: 7,
    color:    GRAY_400,
  },

  // Títulos de seção
  secaoTitulo: {
    fontSize:        11,
    fontFamily:      "Helvetica-Bold",
    color:           GRAY_900,
    marginBottom:    8,
    marginTop:       16,
    paddingBottom:   4,
    borderBottomWidth: 1,
    borderBottomColor: FOLK_LIGHT,
  },
  secaoTituloFolk: {
    backgroundColor: FOLK,
    paddingHorizontal: 8,
    paddingVertical:   4,
    marginTop:       16,
    marginBottom:    8,
    borderRadius:    3,
  },
  secaoTituloFolkTexto: {
    fontSize:   11,
    fontFamily: "Helvetica-Bold",
    color:      WHITE,
  },

  // Cards de KPI
  kpiGrid: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           8,
    marginBottom:  16,
  },
  kpiCard: {
    flex:          1,
    minWidth:      110,
    backgroundColor: GRAY_50,
    borderWidth:   1,
    borderColor:   GRAY_200,
    borderRadius:  4,
    padding:       10,
  },
  kpiCardDestaque: {
    flex:           1,
    minWidth:       110,
    backgroundColor: FOLK_LIGHT,
    borderWidth:    1,
    borderColor:    FOLK,
    borderRadius:   4,
    padding:        10,
  },
  kpiLabel: {
    fontSize: 7,
    color:    GRAY_600,
    marginBottom: 3,
  },
  kpiValor: {
    fontSize:   13,
    fontFamily: "Helvetica-Bold",
    color:      GRAY_900,
  },
  kpiValorFolk: {
    fontSize:   13,
    fontFamily: "Helvetica-Bold",
    color:      FOLK,
  },

  // Tabelas
  tabela: {
    marginTop: 4,
    marginBottom: 12,
  },
  tabelaCabecalho: {
    flexDirection:   "row",
    backgroundColor: GRAY_800,
    paddingHorizontal: 4,
    paddingVertical:   5,
  },
  tabelaCabecalhoTexto: {
    fontSize:   7.5,
    fontFamily: "Helvetica-Bold",
    color:      WHITE,
  },
  tabelaLinha: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingVertical:   4,
    borderBottomWidth: 0.5,
    borderBottomColor: GRAY_100,
  },
  tabelaLinhaAlternada: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingVertical:   4,
    borderBottomWidth: 0.5,
    borderBottomColor: GRAY_100,
    backgroundColor:   GRAY_50,
  },
  tabelaLinhaTotal: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingVertical:   5,
    backgroundColor:   FOLK_LIGHT,
    borderTopWidth:    1,
    borderTopColor:    FOLK,
  },
  tabelaTexto: {
    fontSize: 8,
    color:    GRAY_800,
  },
  tabelaTextoNegrito: {
    fontSize:   8,
    fontFamily: "Helvetica-Bold",
    color:      GRAY_900,
  },
  tabelaTextoFolk: {
    fontSize:   8,
    fontFamily: "Helvetica-Bold",
    color:      FOLK,
  },
  tabelaTextoMono: {
    fontSize: 7.5,
    color:    GRAY_600,
    fontFamily: "Courier",
  },
  tabelaTextoMuted: {
    fontSize: 7.5,
    color:    GRAY_400,
  },

  // Texto comum
  paragrafo: {
    fontSize:    8.5,
    color:       GRAY_600,
    lineHeight:  1.5,
    marginBottom: 6,
  },
  label: {
    fontSize:    7,
    color:       GRAY_400,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  valor: {
    fontSize:    9,
    color:       GRAY_900,
    fontFamily:  "Helvetica-Bold",
  },

  // Grid de campos
  camposGrid: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           12,
    marginBottom:  12,
  },
  campo: {
    minWidth: 100,
  },

  // Alerta
  alerta: {
    flexDirection:   "row",
    backgroundColor: "#FEF3C7",
    borderWidth:     1,
    borderColor:     "#F59E0B",
    borderRadius:    4,
    padding:         8,
    marginBottom:    10,
    alignItems:      "flex-start",
    gap:             6,
  },
  alertaTexto: {
    fontSize: 8,
    color:    "#92400E",
    flex:     1,
  },
});
