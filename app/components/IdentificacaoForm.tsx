"use client";

import { Card, CardHeader } from "./ui";

interface IdentificacaoFormProps {
  responsavel: string;
  participantes: string;
  onChange: (field: "responsavel" | "participantes", value: string) => void;
}

const fields = [
  { id: "responsavel", label: "Responsável pelos registros em ata", placeholder: "Nome do responsável" },
  { id: "participantes", label: "Participantes", placeholder: "Ex: Ana, Bruno, Carlos..." },
] as const;

export default function IdentificacaoForm({ responsavel, participantes, onChange }: IdentificacaoFormProps) {
  const values = { responsavel, participantes };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-bold text-gray-700">Identificação da Reunião</h2>
      </CardHeader>
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        {fields.map(({ id, label, placeholder }) => (
          <div key={id} className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {label}
            </label>
            <input
              id={id}
              type="text"
              value={values[id]}
              onChange={(e) => onChange(id, e.target.value)}
              placeholder={placeholder}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10"
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
