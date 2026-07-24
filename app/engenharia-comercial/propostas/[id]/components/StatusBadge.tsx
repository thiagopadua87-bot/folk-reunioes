import type { EcVersaoStatus } from "@/lib/engenharia-comercial/types";

type Config = { label: string; bg: string; text: string; dot: string };

const STATUS_MAP: Record<EcVersaoStatus, Config> = {
  rascunho:              { label: "Rascunho",           bg: "bg-gray-100",   text: "text-gray-600",  dot: "bg-gray-400" },
  calculado:             { label: "Calculado",           bg: "bg-sky-100",    text: "text-sky-700",   dot: "bg-sky-500" },
  aguardando_aprovacao:  { label: "Aguard. Aprovação",  bg: "bg-amber-100",  text: "text-amber-700", dot: "bg-amber-500" },
  aprovacao_concedida:   { label: "Aprovação Concedida",bg: "bg-teal-100",   text: "text-teal-700",  dot: "bg-teal-500" },
  aprovacao_negada:      { label: "Aprovação Negada",   bg: "bg-red-100",    text: "text-red-700",   dot: "bg-red-500" },
  enviada:               { label: "Enviada",             bg: "bg-indigo-100", text: "text-indigo-700",dot: "bg-indigo-500" },
  aprovada_cliente:      { label: "Aprovada pelo Cliente",bg:"bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  recusada:              { label: "Recusada",            bg: "bg-red-100",    text: "text-red-700",   dot: "bg-red-500" },
};

const PROPOSTA_STATUS_MAP: Record<string, Omit<Config, "dot">> = {
  rascunho:  { label: "Rascunho",  bg: "bg-gray-100",  text: "text-gray-600" },
  ativa:     { label: "Ativa",     bg: "bg-blue-100",  text: "text-blue-700" },
  encerrada: { label: "Encerrada", bg: "bg-green-100", text: "text-green-700" },
  cancelada: { label: "Cancelada", bg: "bg-red-100",   text: "text-red-600" },
};

export function StatusBadgeVersao({
  status,
  small = false,
}: {
  status: EcVersaoStatus;
  small?: boolean;
}) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.rascunho;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${cfg.bg} ${cfg.text} ${
        small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function StatusBadgeProposta({ status }: { status: string }) {
  const cfg = PROPOSTA_STATUS_MAP[status] ?? PROPOSTA_STATUS_MAP.rascunho;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

export function versaoStatusLabel(status: EcVersaoStatus): string {
  return STATUS_MAP[status]?.label ?? status;
}
