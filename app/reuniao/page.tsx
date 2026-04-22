"use client";

import { useEffect, useState } from "react";
import MeetingBlock from "@/app/components/MeetingBlock";
import FinalizarButton from "@/app/components/FinalizarButton";
import ResumoCard from "@/app/components/ResumoCard";
import IdentificacaoForm from "@/app/components/IdentificacaoForm";
import { Alert } from "@/app/components/ui";
import { salvarReuniao } from "@/lib/reunioes";
import { gerarResumo } from "@/lib/resumo";
import { initialBlocos, type BlocoConfig, type LinhaTabela } from "@/lib/blocos";
import { buscarDadosComerciais, salvarDadosComerciais } from "@/lib/dados-comerciais";
import { buscarDadosProjetos, salvarDadosProjetos } from "@/lib/dados-projetos";
import { supabase } from "@/lib/supabase";

const ID_VENDAS   = "Comercial-0";
const ID_PIPELINE = "Comercial-1";
const ID_PROJETOS = "Projetos-0";
const ID_OBRAS    = "Projetos-1";

interface Identificacao {
  responsavel: string;
  participantes: string;
}

type FeedbackStatus = "idle" | "success" | "error";

const initialIdentificacao: Identificacao = { responsavel: "", participantes: "" };

function mesclarLinhas(
  blocos: BlocoConfig[],
  mapa: Record<string, LinhaTabela[]>
): BlocoConfig[] {
  return blocos.map((bloco) => ({
    ...bloco,
    itens: bloco.itens.map((item) =>
      item.id in mapa ? { ...item, linhas: mapa[item.id] } : item
    ),
  }));
}

export default function Home() {
  const [blocos, setBlocos] = useState<BlocoConfig[]>(initialBlocos);
  const [identificacao, setIdentificacao] = useState<Identificacao>(initialIdentificacao);
  const [userId, setUserId] = useState<string | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ status: FeedbackStatus; message: string }>({
    status: "idle",
    message: "",
  });

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", user.id)
        .single();

      if (profile?.nome) setNomeUsuario(profile.nome);

      const [comercial, projetos] = await Promise.all([
        buscarDadosComerciais(user.id),
        buscarDadosProjetos(user.id),
      ]);

      setBlocos((prev) =>
        mesclarLinhas(prev, {
          [ID_VENDAS]:   comercial.vendas,
          [ID_PIPELINE]: comercial.pipeline,
          [ID_PROJETOS]: projetos.projetos,
          [ID_OBRAS]:    projetos.obras,
        })
      );
    }

    init().catch(console.error);
  }, []);

  const resumo = gerarResumo(
    blocos.map((b) => ({ nome: b.nome, itens: b.itens })),
    identificacao
  );

  function handleIdentificacaoChange(field: "responsavel" | "participantes", value: string) {
    setIdentificacao((prev) => ({ ...prev, [field]: value }));
  }

  function handleAnotacaoChange(blocoNome: string, itemId: string, value: string) {
    setBlocos((prev) =>
      prev.map((bloco) =>
        bloco.nome !== blocoNome ? bloco : {
          ...bloco,
          itens: bloco.itens.map((item) => item.id === itemId ? { ...item, anotacao: value } : item),
        }
      )
    );
  }

  function handleLinhasChange(blocoNome: string, itemId: string, linhas: LinhaTabela[]) {
    setBlocos((prev) =>
      prev.map((bloco) =>
        bloco.nome !== blocoNome ? bloco : {
          ...bloco,
          itens: bloco.itens.map((item) => item.id === itemId ? { ...item, linhas } : item),
        }
      )
    );
  }

  async function handleFinalizar() {
    if (!userId) return;

    setLoading(true);
    setFeedback({ status: "idle", message: "" });

    try {
      const getLinhas = (id: string) =>
        blocos.flatMap((b) => b.itens).find((i) => i.id === id)?.linhas ?? [];

      await Promise.all([
        salvarReuniao({
          ...identificacao,
          blocos: blocos.map((b) => ({ nome: b.nome, itens: b.itens })),
          progresso: 0,
          resumo,
          user_id: userId,
        }),
        salvarDadosComerciais(userId, {
          vendas:   getLinhas(ID_VENDAS),
          pipeline: getLinhas(ID_PIPELINE),
        }),
        salvarDadosProjetos(userId, {
          projetos: getLinhas(ID_PROJETOS),
          obras:    getLinhas(ID_OBRAS),
        }),
      ]);

      setFeedback({ status: "success", message: "Reunião salva com sucesso!" });
      setBlocos(initialBlocos());
      setIdentificacao(initialIdentificacao);

      const [c, p] = await Promise.all([
        buscarDadosComerciais(userId),
        buscarDadosProjetos(userId),
      ]);
      setBlocos((prev) =>
        mesclarLinhas(prev, {
          [ID_VENDAS]:   c.vendas,
          [ID_PIPELINE]: c.pipeline,
          [ID_PROJETOS]: p.projetos,
          [ID_OBRAS]:    p.obras,
        })
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar a reunião.";
      setFeedback({ status: "error", message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reunião Semanal</h1>
        {nomeUsuario && (
          <p className="mt-1 text-sm text-gray-500">
            Bem-vindo, {nomeUsuario}! Conduza cada bloco e registre as anotações da equipe.
          </p>
        )}
        {!nomeUsuario && (
          <p className="mt-1 text-sm text-gray-500">
            Conduza cada bloco e registre as anotações da equipe
          </p>
        )}
      </div>

      <div className="mb-6">
        <IdentificacaoForm
          responsavel={identificacao.responsavel}
          participantes={identificacao.participantes}
          onChange={handleIdentificacaoChange}
        />
      </div>

      <div className="flex flex-col gap-4">
        {blocos.map((bloco) => (
          <MeetingBlock
            key={bloco.nome}
            bloco={bloco}
            onAnotacaoChange={(itemId, value) => handleAnotacaoChange(bloco.nome, itemId, value)}
            onLinhasChange={(itemId, linhas) => handleLinhasChange(bloco.nome, itemId, linhas)}
          />
        ))}
      </div>

      <div className="mt-8">
        <ResumoCard resumo={resumo} />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {feedback.status !== "idle" && (
          <Alert status={feedback.status} message={feedback.message} />
        )}
        <FinalizarButton onClick={handleFinalizar} loading={loading} disabled={!userId} />
      </div>
    </main>
  );
}
