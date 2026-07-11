"use client";

import { useState, useTransition } from "react";
import { inativarUsuario } from "./actions";
import type { ProfileExtended } from "@/lib/profiles";

interface Props {
  user:     ProfileExtended;
  onClose:  () => void;
  onDone:   () => void;
}

export default function InativarModal({ user, onClose, onDone }: Props) {
  const [motivo,          setMotivo]          = useState("");
  const [dataDesligamento, setDataDesligamento] = useState("");
  const [erro,            setErro]            = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirmar() {
    setErro("");
    startTransition(async () => {
      try {
        await inativarUsuario(user.id, motivo, dataDesligamento || null);
        onDone();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao inativar.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xl">⛔</span>
            <h2 className="text-base font-bold text-gray-900">Inativar usuário</h2>
          </div>
          <p className="text-sm text-gray-500">
            Você está prestes a inativar{" "}
            <span className="font-semibold text-gray-800">{user.nome}</span>.
            O acesso ao sistema será revogado imediatamente.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Motivo
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Desligamento, transferência, afastamento..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10 resize-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Data de desligamento{" "}
              <span className="normal-case font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              type="date"
              value={dataDesligamento}
              onChange={(e) => setDataDesligamento(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-folk focus:ring-2 focus:ring-folk/10"
            />
          </div>
        </div>

        {erro && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {erro}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={isPending}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? "Inativando..." : "Confirmar inativação"}
          </button>
        </div>
      </div>
    </div>
  );
}
