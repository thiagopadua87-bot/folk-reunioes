"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  buscarReuniao, listarParticipantes, listarAcoes, listarPendencias,
  buscarNomePerfil, formatData, formatNumeroAcao,
  type ReuniaoV2, type ReuniaoParticipante, type ReuniaoAcao, type AcaoStatus, type AcaoPrioridade,
} from "@/lib/reunioes-v2";

const STATUS_LABEL: Record<AcaoStatus, string> = {
  NAO_INICIADO: "Não iniciado",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO:    "Concluído",
  CANCELADO:    "Cancelado",
};

const PRIORIDADE_LABEL: Record<AcaoPrioridade, string> = {
  BAIXA:   "Baixa",
  NORMAL:  "Normal",
  ALTA:    "Alta",
  CRITICA: "Crítica",
};

export default function AtaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [reuniao, setReuniao]         = useState<ReuniaoV2 | null>(null);
  const [participantes, setParticipantes] = useState<ReuniaoParticipante[]>([]);
  const [acoes, setAcoes]             = useState<ReuniaoAcao[]>([]);
  const [pendencias, setPendencias]   = useState<(ReuniaoAcao & { reuniao_titulo: string; reuniao_data: string })[]>([]);
  const [nomeFinalizador, setNomeFinalizador] = useState<string | null>(null);
  const [carregando, setCarregando]   = useState(true);
  const [erro, setErro]               = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [r, p, a, pend] = await Promise.all([
          buscarReuniao(id),
          listarParticipantes(id),
          listarAcoes(id),
          listarPendencias(id),
        ]);
        setReuniao(r);
        setParticipantes(p);
        setAcoes(a);
        setPendencias(pend);

        if (r.finalizada_por) {
          const nome = await buscarNomePerfil(r.finalizada_por);
          setNomeFinalizador(nome);
        }
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao carregar ata.");
      } finally {
        setCarregando(false);
      }
    }
    load();
  }, [id]);

  if (carregando) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="py-16 text-center text-sm text-gray-400">Carregando ata...</div>
      </main>
    );
  }

  if (erro || !reuniao) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-sm text-red-600">{erro ?? "Ata não encontrada."}</p>
      </main>
    );
  }

  const hoje       = new Date().toISOString().split("T")[0];
  const totalAcoes = acoes.length;
  const concluidas = acoes.filter((a) => a.status === "CONCLUIDO").length;
  const pendentesAt = acoes.filter((a) => a.status === "NAO_INICIADO" || a.status === "EM_ANDAMENTO").length;
  const atrasadas  = acoes.filter(
    (a) => a.when_date < hoje && a.status !== "CONCLUIDO" && a.status !== "CANCELADO"
  ).length;

  const presentes = participantes.filter((p) => p.presente);
  const ausentes  = participantes.filter((p) => !p.presente);

  const dataReuniao = new Date(reuniao.data).toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  const finalizadaEm = reuniao.finalizada_at
    ? new Date(reuniao.finalizada_at)
    : null;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12px; color: #111; }
          table { border-collapse: collapse; }
        }
      `}</style>

      {/* Controles (não impressos) */}
      <div className="no-print mx-auto max-w-4xl px-4 py-4 flex items-center gap-3 border-b border-gray-200 bg-white sticky top-0 z-10">
        <button
          onClick={() => router.push(`/reuniao/${id}`)}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Voltar
        </button>
        <button
          onClick={() => window.print()}
          className="ml-auto rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm"
        >
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* Corpo da ata */}
      <div className="mx-auto max-w-4xl px-8 py-8 text-gray-900">

        {/* Cabeçalho */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold uppercase tracking-widest">Ata de Reunião</h1>
          <p className="mt-1 text-lg font-semibold">{reuniao.titulo}</p>
        </div>

        {/* Identificação */}
        <div className="mb-6 rounded-xl border border-gray-200 p-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-semibold text-gray-500">Data:</span>{" "}
              <span className="capitalize">{dataReuniao}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">Horário:</span>{" "}
              {reuniao.horario_inicio ?? "—"} — {reuniao.horario_fim ?? "—"}
            </div>
            {reuniao.responsavel && (
              <div className="col-span-2">
                <span className="font-semibold text-gray-500">Responsável pelos registros:</span>{" "}
                {reuniao.responsavel}
              </div>
            )}
          </div>
        </div>

        {/* Participantes */}
        {participantes.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 border-b border-gray-200 pb-1 text-base font-bold uppercase tracking-wide text-gray-700">
              Participantes
            </h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {presentes.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                  <span>{p.nome}</span>
                  <span className="text-xs text-gray-400">Presente</span>
                </div>
              ))}
              {ausentes.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gray-300 shrink-0" />
                  <span className="text-gray-500">{p.nome}</span>
                  <span className="text-xs text-gray-400">Ausente</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pendências Herdadas */}
        {pendencias.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 border-b border-gray-200 pb-1 text-base font-bold uppercase tracking-wide text-gray-700">
              Pendências Herdadas — Revisão
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                  <th className="border border-gray-200 px-3 py-2">Origem</th>
                  <th className="border border-gray-200 px-3 py-2">O que</th>
                  <th className="border border-gray-200 px-3 py-2">Responsável</th>
                  <th className="border border-gray-200 px-3 py-2">Prazo</th>
                  <th className="border border-gray-200 px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {pendencias.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="border border-gray-200 px-3 py-2 text-xs text-gray-500">
                      <div className="font-medium text-gray-700">{p.reuniao_titulo}</div>
                      <div>{formatData(p.reuniao_data.split("T")[0])}</div>
                    </td>
                    <td className="border border-gray-200 px-3 py-2">{p.what}</td>
                    <td className="border border-gray-200 px-3 py-2">{p.who}</td>
                    <td className="border border-gray-200 px-3 py-2">{formatData(p.when_date)}</td>
                    <td className="border border-gray-200 px-3 py-2">{STATUS_LABEL[p.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Ações e Encaminhamentos */}
        <section className="mb-6">
          <h2 className="mb-3 border-b border-gray-200 pb-1 text-base font-bold uppercase tracking-wide text-gray-700">
            Ações e Encaminhamentos
          </h2>

          {acoes.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Nenhuma ação registrada.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                  <th className="border border-gray-200 px-3 py-2 w-16">Código</th>
                  <th className="border border-gray-200 px-3 py-2">O que</th>
                  <th className="border border-gray-200 px-3 py-2">Como / Discussão</th>
                  <th className="border border-gray-200 px-3 py-2">Prioridade</th>
                  <th className="border border-gray-200 px-3 py-2">Responsável</th>
                  <th className="border border-gray-200 px-3 py-2">Prazo</th>
                  <th className="border border-gray-200 px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {acoes.map((a) => {
                  const origemAcao = a.origem_acao_id
                    ? acoes.find((x) => x.id === a.origem_acao_id)
                    : null;
                  return (
                    <tr key={a.id} className="border-b border-gray-100">
                      <td className="border border-gray-200 px-3 py-2 font-mono text-xs text-gray-500">
                        {formatNumeroAcao(a.numero_seq)}
                        {origemAcao && (
                          <div className="text-[10px] text-gray-400">
                            ↑ {formatNumeroAcao(origemAcao.numero_seq)}
                          </div>
                        )}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 font-medium">{a.what}</td>
                      <td className="border border-gray-200 px-3 py-2 text-gray-600">
                        {a.how || "—"}
                        {a.observacoes && (
                          <div className="mt-1 text-xs text-gray-400 italic">{a.observacoes}</div>
                        )}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-xs">
                        {PRIORIDADE_LABEL[a.prioridade]}
                      </td>
                      <td className="border border-gray-200 px-3 py-2">{a.who}</td>
                      <td className="border border-gray-200 px-3 py-2">{formatData(a.when_date)}</td>
                      <td className="border border-gray-200 px-3 py-2">{STATUS_LABEL[a.status]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* Observações gerais */}
        {reuniao.observacoes_gerais && (
          <section className="mb-6">
            <h2 className="mb-3 border-b border-gray-200 pb-1 text-base font-bold uppercase tracking-wide text-gray-700">
              Observações Gerais
            </h2>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{reuniao.observacoes_gerais}</p>
          </section>
        )}

        {/* Resumo executivo */}
        <section className="mb-6">
          <h2 className="mb-3 border-b border-gray-200 pb-1 text-base font-bold uppercase tracking-wide text-gray-700">
            Resumo Executivo
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
            <div className="rounded-xl border border-gray-200 p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{totalAcoes}</div>
              <div className="mt-0.5 text-xs text-gray-500">Total de ações</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{concluidas}</div>
              <div className="mt-0.5 text-xs text-gray-500">Concluídas</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{pendentesAt}</div>
              <div className="mt-0.5 text-xs text-gray-500">Pendentes</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{atrasadas}</div>
              <div className="mt-0.5 text-xs text-gray-500">Atrasadas</div>
            </div>
          </div>
        </section>

        {/* Assinatura da finalização */}
        {finalizadaEm && (
          <section className="mb-6">
            <h2 className="mb-3 border-b border-gray-200 pb-1 text-base font-bold uppercase tracking-wide text-gray-700">
              Ata Finalizada Por
            </h2>
            <div className="rounded-xl border border-gray-200 p-4 text-sm">
              {nomeFinalizador && (
                <p className="font-semibold text-gray-900">{nomeFinalizador}</p>
              )}
              <div className="mt-1 flex gap-6 text-gray-500">
                <span>
                  Data:{" "}
                  <span className="font-medium text-gray-700">
                    {finalizadaEm.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                </span>
                <span>
                  Hora:{" "}
                  <span className="font-medium text-gray-700">
                    {finalizadaEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Rodapé */}
        <div className="mt-8 border-t border-gray-200 pt-4 text-xs text-gray-400 text-center">
          {reuniao.motivo_reabertura && (
            <p className="mb-1 text-amber-600">
              Reaberta em {reuniao.reaberta_em
                ? new Date(reuniao.reaberta_em).toLocaleDateString("pt-BR")
                : "—"}
              {" — "}Motivo: {reuniao.motivo_reabertura}
            </p>
          )}
          Documento gerado pelo sistema Folk Reuniões
          {reuniao.responsavel && ` · Responsável: ${reuniao.responsavel}`}
        </div>
      </div>
    </>
  );
}
