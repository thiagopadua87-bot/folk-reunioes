"use client";

import { useState, useEffect, useMemo } from "react";
import {
  buscarMemorialEngenharia,
  compararBom,
} from "@/lib/engenharia-comercial/engenharia-db";
import type {
  BomItemView,
  ComparacaoBom,
  DeltaBomItem,
  MemorialEngenharia,
} from "@/lib/engenharia-comercial/engenharia-db";
import type { VersaoListItem } from "@/lib/engenharia-comercial/propostas-db";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const NUM = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// ── BOM filtrada ──────────────────────────────────────────────

function BomTable({ itens }: { itens: BomItemView[] }) {
  const totalGeral = useMemo(
    () => itens.reduce((s, i) => s + i.custoTotal, 0),
    [itens]
  );

  if (itens.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        Nenhum item corresponde aos filtros aplicados.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
            <th className="px-3 py-2 text-left">Código</th>
            <th className="px-3 py-2 text-left">Descrição</th>
            <th className="px-3 py-2 text-left">Categoria</th>
            <th className="px-3 py-2 text-left">Fabricante</th>
            <th className="px-3 py-2 text-right">Qtd</th>
            <th className="px-3 py-2 text-left">Un</th>
            <th className="px-3 py-2 text-right">Custo unit.</th>
            <th className="px-3 py-2 text-right">Custo total</th>
            <th className="px-3 py-2 text-left">Fornecedor</th>
            <th className="px-3 py-2 text-left">Origem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {itens.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50/50">
              <td className="px-3 py-2 font-mono text-xs text-gray-500">{item.codigo || "—"}</td>
              <td className="px-3 py-2 font-medium text-gray-800">{item.nome}</td>
              <td className="px-3 py-2 text-gray-600">{item.categoria || "—"}</td>
              <td className="px-3 py-2 text-gray-600">{item.fabricante || "—"}</td>
              <td className="px-3 py-2 text-right font-semibold text-gray-800">{NUM.format(item.quantidade)}</td>
              <td className="px-3 py-2 text-gray-500">{item.unidade}</td>
              <td className="px-3 py-2 text-right text-gray-700">{BRL.format(item.custoUnitario)}</td>
              <td className="px-3 py-2 text-right font-semibold text-gray-900">{BRL.format(item.custoTotal)}</td>
              <td className="px-3 py-2 text-gray-600">{item.fornecedorNome || "—"}</td>
              <td className="px-3 py-2">
                <OrigemBadge origem={item.origem} nome={item.origemNome} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
            <td colSpan={7} className="px-3 py-2 text-right text-sm text-gray-600">Total geral</td>
            <td className="px-3 py-2 text-right text-sm text-gray-900">{BRL.format(totalGeral)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function OrigemBadge({ origem, nome }: { origem: string; nome: string }) {
  const cfg = {
    kit:    { bg: "bg-blue-50",   text: "text-blue-700",   label: "Kit"   },
    regra:  { bg: "bg-purple-50", text: "text-purple-700", label: "Regra" },
    manual: { bg: "bg-gray-100",  text: "text-gray-700",   label: "Manual"},
  }[origem] ?? { bg: "bg-gray-100", text: "text-gray-700", label: origem };

  return (
    <span
      className={`inline-block max-w-[120px] truncate rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}
      title={nome}
    >
      {cfg.label}: {nome}
    </span>
  );
}

// ── Memorial de engenharia ────────────────────────────────────

function MemorialView({ memorial }: { memorial: MemorialEngenharia }) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [mostrarContexto, setMostrarContexto] = useState(false);
  const [mostrarPremissas, setMostrarPremissas] = useState(false);

  function toggle(key: string) {
    setAbertos((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const contextoEntries = Object.entries(memorial.contexto).filter(([, v]) => v > 0);

  return (
    <div className="space-y-3">
      {/* Categorias → Soluções → Kits → Itens */}
      {memorial.categorias.map((cat) => (
        <div key={cat.categoria} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button
            onClick={() => toggle(cat.categoria)}
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-bold text-gray-800">{cat.categoria}</span>
              <span className="text-xs text-gray-400">→</span>
              <span className={`text-sm font-medium ${cat.solucaoId ? "text-folk" : "text-red-500"}`}>
                {cat.solucaoNome}
              </span>
            </div>
            <ChevronIcon open={abertos.has(cat.categoria)} />
          </button>

          {abertos.has(cat.categoria) && (
            <div className="border-t border-gray-100 px-4 pb-4 pt-3">
              {cat.kits.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhum kit carregado para esta solução.</p>
              ) : (
                <div className="space-y-3">
                  {cat.kits.map((kit) => (
                    <div key={kit.kitId} className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2">
                      <p className="mb-2 text-xs font-semibold text-blue-800">
                        Kit: {kit.kitNome}
                      </p>
                      {kit.itens.length === 0 ? (
                        <p className="text-xs text-gray-400">Nenhum item no BOM deste kit.</p>
                      ) : (
                        <div className="space-y-1">
                          {kit.itens.map((item) => (
                            <div key={item.itemId} className="flex items-center gap-2 text-xs text-gray-700">
                              <span className="h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                              <span className="font-medium">{NUM.format(item.quantidade)} {item.unidade}</span>
                              <span>×</span>
                              <span>{item.nome}</span>
                              {item.codigo && (
                                <span className="font-mono text-gray-400">({item.codigo})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Regras aplicadas */}
      {memorial.regras.length > 0 && (
        <div className="rounded-xl border border-purple-200 bg-white overflow-hidden">
          <button
            onClick={() => toggle("__regras__")}
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50/50 transition-colors"
          >
            <span className="text-sm font-bold text-gray-800">
              Regras de composição aplicadas
              <span className="ml-2 text-xs font-normal text-gray-400">({memorial.regras.length})</span>
            </span>
            <ChevronIcon open={abertos.has("__regras__")} />
          </button>

          {abertos.has("__regras__") && (
            <div className="border-t border-gray-100 space-y-3 px-4 pb-4 pt-3">
              {memorial.regras.map((regra) => (
                <div key={regra.regraName} className="rounded-lg border border-purple-100 bg-purple-50/50 px-3 py-2">
                  <p className="mb-2 text-xs font-semibold text-purple-800">Regra: {regra.regraName}</p>
                  <div className="space-y-1">
                    {regra.itens.map((item) => (
                      <div key={item.itemId} className="flex items-center gap-2 text-xs text-gray-700">
                        <span className="h-1 w-1 shrink-0 rounded-full bg-purple-400" />
                        <span className="font-medium">{NUM.format(item.quantidade)} {item.unidade}</span>
                        <span>×</span>
                        <span>{item.nome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contexto de composição */}
      {contextoEntries.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button
            onClick={() => setMostrarContexto((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50/50 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-700">Contexto de composição</span>
            <ChevronIcon open={mostrarContexto} />
          </button>
          {mostrarContexto && (
            <div className="border-t border-gray-100 px-4 pb-3 pt-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {contextoEntries.map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="font-mono text-xs text-gray-500">{k}</p>
                    <p className="text-sm font-bold text-gray-800">{NUM.format(v)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Premissas utilizadas */}
      {memorial.premissas.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button
            onClick={() => setMostrarPremissas((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50/50 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-700">
              Premissas de engenharia
              <span className="ml-2 text-xs font-normal text-gray-400">({memorial.premissas.length})</span>
            </span>
            <ChevronIcon open={mostrarPremissas} />
          </button>
          {mostrarPremissas && (
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {memorial.premissas.map((p) => (
                <div key={p.chave} className="flex items-center justify-between px-4 py-2 text-sm">
                  <div>
                    <span className="font-mono text-xs text-gray-500">{p.chave}</span>
                    {p.descricao && <span className="ml-2 text-xs text-gray-400">{p.descricao}</span>}
                  </div>
                  <span className="font-semibold text-gray-800">{p.valor}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Painel de comparação entre versões ────────────────────────

function ComparacaoPanel({
  versaoAtualId,
  versoes,
}: {
  versaoAtualId: string;
  versoes:       VersaoListItem[];
}) {
  const calculadas = versoes.filter(
    (v) =>
      v.id !== versaoAtualId &&
      v.valorImplantacao !== null
  );

  const [versaoCompareId, setVersaoCompareId] = useState<string>(calculadas[0]?.id ?? "");
  const [comparacao, setComparacao] = useState<ComparacaoBom | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [expandido, setExpandido]   = useState(false);

  async function carregar(vId: string) {
    if (!vId) return;
    setCarregando(true);
    setComparacao(null);
    try {
      const resultado = await compararBom(vId, versaoAtualId);
      setComparacao(resultado);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (versaoCompareId && expandido) carregar(versaoCompareId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versaoCompareId, expandido]);

  if (calculadas.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50/50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700">Comparar com versão anterior</span>
        <ChevronIcon open={expandido} />
      </button>

      {expandido && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600">Comparar com:</label>
            <select
              value={versaoCompareId}
              onChange={(e) => setVersaoCompareId(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm focus:border-folk focus:outline-none"
            >
              {calculadas.map((v) => (
                <option key={v.id} value={v.id}>
                  V{v.numero} — {v.status}
                  {v.valorImplantacao ? ` (${BRL.format(v.valorImplantacao)})` : ""}
                </option>
              ))}
            </select>
            <button
              onClick={() => carregar(versaoCompareId)}
              disabled={carregando || !versaoCompareId}
              className="rounded-lg border border-folk/30 bg-folk/5 px-3 py-1 text-xs font-semibold text-folk hover:bg-folk/10 disabled:opacity-40"
            >
              {carregando ? "Carregando..." : "Comparar"}
            </button>
          </div>

          {comparacao && (
            <div className="space-y-4">
              {/* Resumo financeiro */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <DeltaCard
                  label="Implantação atual"
                  valor={comparacao.implantacaoB ?? 0}
                  tipo="neutro"
                />
                <DeltaCard
                  label="Δ Implantação"
                  valor={comparacao.deltaImplantacao ?? 0}
                  tipo={(comparacao.deltaImplantacao ?? 0) <= 0 ? "positivo" : "negativo"}
                  prefixo={true}
                />
                <DeltaCard
                  label="Mensalidade atual"
                  valor={comparacao.mensalB ?? 0}
                  tipo="neutro"
                />
                <DeltaCard
                  label="Δ Mensalidade"
                  valor={comparacao.deltaMensal ?? 0}
                  tipo={(comparacao.deltaMensal ?? 0) <= 0 ? "positivo" : "negativo"}
                  prefixo={true}
                />
              </div>

              {/* Resumo de alterações */}
              <div className="flex flex-wrap gap-2 text-xs">
                {comparacao.adicionados.length > 0 && (
                  <span className="rounded-full bg-green-50 px-2.5 py-1 font-medium text-green-700">
                    +{comparacao.adicionados.length} adicionado{comparacao.adicionados.length > 1 ? "s" : ""}
                  </span>
                )}
                {comparacao.removidos.length > 0 && (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-700">
                    −{comparacao.removidos.length} removido{comparacao.removidos.length > 1 ? "s" : ""}
                  </span>
                )}
                {comparacao.alterados.length > 0 && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                    ~{comparacao.alterados.length} alterado{comparacao.alterados.length > 1 ? "s" : ""}
                  </span>
                )}
                {comparacao.iguais > 0 && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-500">
                    {comparacao.iguais} igual{comparacao.iguais > 1 ? "is" : ""}
                  </span>
                )}
              </div>

              {/* Detalhamento */}
              {comparacao.adicionados.length > 0 && (
                <DeltaSection
                  titulo="Itens adicionados"
                  cor="green"
                  itens={comparacao.adicionados}
                  sinal="+"
                />
              )}
              {comparacao.removidos.length > 0 && (
                <DeltaSection
                  titulo="Itens removidos"
                  cor="red"
                  itens={comparacao.removidos}
                  sinal="−"
                />
              )}
              {comparacao.alterados.length > 0 && (
                <DeltaSection
                  titulo="Quantidades alteradas"
                  cor="amber"
                  itens={comparacao.alterados}
                  sinal="~"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DeltaCard({
  label, valor, tipo, prefixo,
}: {
  label:   string;
  valor:   number;
  tipo:    "neutro" | "positivo" | "negativo";
  prefixo?: boolean;
}) {
  const colorMap = {
    neutro:   "text-gray-900",
    positivo: "text-green-700",
    negativo: "text-red-700",
  };
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-bold ${colorMap[tipo]}`}>
        {prefixo && valor > 0 ? "+" : ""}{BRL.format(valor)}
      </p>
    </div>
  );
}

function DeltaSection({
  titulo, cor, itens, sinal,
}: {
  titulo: string;
  cor:    "green" | "red" | "amber";
  itens:  DeltaBomItem[];
  sinal:  string;
}) {
  const cfg = {
    green: { bg: "bg-green-50",  border: "border-green-200", text: "text-green-800" },
    red:   { bg: "bg-red-50",    border: "border-red-200",   text: "text-red-800"   },
    amber: { bg: "bg-amber-50",  border: "border-amber-200", text: "text-amber-800" },
  }[cor];

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <p className={`px-3 py-2 text-xs font-bold ${cfg.text}`}>{sinal} {titulo}</p>
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-current/10 font-medium text-gray-500">
            <th className="px-3 py-1 text-left">Item</th>
            <th className="px-3 py-1 text-right">Qtd antes</th>
            <th className="px-3 py-1 text-right">Qtd depois</th>
            <th className="px-3 py-1 text-right">Δ Custo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {itens.map((item) => (
            <tr key={item.itemId}>
              <td className="px-3 py-1.5 font-medium text-gray-800">{item.nome}</td>
              <td className="px-3 py-1.5 text-right text-gray-600">
                {item.qtdA > 0 ? NUM.format(item.qtdA) : "—"} {item.unidade}
              </td>
              <td className="px-3 py-1.5 text-right text-gray-600">
                {item.qtdB > 0 ? NUM.format(item.qtdB) : "—"} {item.unidade}
              </td>
              <td className={`px-3 py-1.5 text-right font-semibold ${item.deltaCusto >= 0 ? "text-red-700" : "text-green-700"}`}>
                {item.deltaCusto >= 0 ? "+" : ""}{BRL.format(item.deltaCusto)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Chevron util ──────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Componente principal ──────────────────────────────────────

export function EngenhariaTab({
  versaoId,
  versoes,
}: {
  versaoId: string;
  versoes:  VersaoListItem[];
}) {
  const [bom, setBom]           = useState<BomItemView[]>([]);
  const [memorial, setMemorial] = useState<MemorialEngenharia | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]         = useState<string | null>(null);
  const [aba, setAba]           = useState<"bom" | "memorial" | "comparacao">("bom");

  // Filtros da BOM
  const [busca,       setBusca]       = useState("");
  const [filtroOrig,  setFiltroOrig]  = useState("");
  const [filtroCat,   setFiltroCat]   = useState("");
  const [filtroForn,  setFiltroForn]  = useState("");
  const [filtroFabr,  setFiltroFabr]  = useState("");

  useEffect(() => {
    setCarregando(true); setErro(null);
    buscarMemorialEngenharia(versaoId)
      .then((m) => { setBom(m.bom); setMemorial(m); })
      .catch((e) => setErro((e as Error).message))
      .finally(() => setCarregando(false));
  }, [versaoId]);

  const categorias  = useMemo(() => [...new Set(bom.map((i) => i.categoria).filter(Boolean))].sort(), [bom]);
  const fornecedores = useMemo(() => [...new Set(bom.map((i) => i.fornecedorNome).filter(Boolean))].sort(), [bom]);
  const fabricantes  = useMemo(() => [...new Set(bom.map((i) => i.fabricante).filter(Boolean))].sort(), [bom]);

  const bomFiltrada = useMemo(() => {
    const q = busca.toLowerCase();
    return bom.filter((i) => {
      if (q && !i.nome.toLowerCase().includes(q) && !i.codigo.toLowerCase().includes(q)) return false;
      if (filtroOrig && i.origem !== filtroOrig) return false;
      if (filtroCat  && i.categoria !== filtroCat) return false;
      if (filtroForn && i.fornecedorNome !== filtroForn) return false;
      if (filtroFabr && i.fabricante !== filtroFabr) return false;
      return true;
    });
  }, [bom, busca, filtroOrig, filtroCat, filtroForn, filtroFabr]);

  if (carregando) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Erro ao carregar dados de engenharia: {erro}
      </div>
    );
  }

  if (bom.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-10 text-center">
        <p className="text-3xl">🔧</p>
        <p className="mt-2 text-sm font-semibold text-gray-600">Lista de materiais vazia</p>
        <p className="mt-1 text-xs text-gray-400">
          O motor ainda não gerou itens para esta versão.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit">
        {(
          [
            { id: "bom",       label: `BOM (${bom.length})` },
            { id: "memorial",  label: "Memorial de engenharia" },
            { id: "comparacao",label: "Comparar versões" },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              aba === id
                ? "bg-white text-folk shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── BOM ── */}
      {aba === "bom" && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2 border-b border-gray-100 bg-gray-50/60 px-4 py-3">
            <input
              type="text"
              placeholder="Buscar nome ou código…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-44 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm placeholder:text-gray-400 focus:border-folk focus:outline-none"
            />
            <FilterSelect label="Origem" value={filtroOrig} onChange={setFiltroOrig}
              options={[
                { value: "kit",    label: "Kit"    },
                { value: "regra",  label: "Regra"  },
                { value: "manual", label: "Manual" },
              ]}
            />
            <FilterSelect label="Categoria" value={filtroCat} onChange={setFiltroCat}
              options={categorias.map((c) => ({ value: c, label: c }))}
            />
            <FilterSelect label="Fornecedor" value={filtroForn} onChange={setFiltroForn}
              options={fornecedores.map((f) => ({ value: f, label: f }))}
            />
            <FilterSelect label="Fabricante" value={filtroFabr} onChange={setFiltroFabr}
              options={fabricantes.map((f) => ({ value: f, label: f }))}
            />
            {(busca || filtroOrig || filtroCat || filtroForn || filtroFabr) && (
              <button
                onClick={() => { setBusca(""); setFiltroOrig(""); setFiltroCat(""); setFiltroForn(""); setFiltroFabr(""); }}
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100"
              >
                Limpar filtros
              </button>
            )}
          </div>
          <BomTable itens={bomFiltrada} />
        </div>
      )}

      {/* ── Memorial ── */}
      {aba === "memorial" && memorial && (
        <MemorialView memorial={memorial} />
      )}

      {/* ── Comparação ── */}
      {aba === "comparacao" && (
        <ComparacaoPanel versaoAtualId={versaoId} versoes={versoes} />
      )}
    </div>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label:   string;
  value:   string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-folk focus:outline-none"
    >
      <option value="">{label}: todos</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
