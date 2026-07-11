"use client";

import { useState, useEffect } from "react";
import {
  SCREENS, SCREEN_GROUPS, FULL_ACCESS,
  fetchUserPermissions, saveUserPermissions,
  type PermissionsMap, type ScreenKey,
} from "@/lib/permissions";

interface Props {
  userId:   string;
  userName: string;
  onClose:  () => void;
}

export default function PermissionsMatrix({ userId, userName, onClose }: Props) {
  const [draft,    setDraft]    = useState<PermissionsMap>({});
  const [loading,  setLoading]  = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro,     setErro]     = useState("");
  const [sucesso,  setSucesso]  = useState("");

  useEffect(() => {
    setLoading(true);
    fetchUserPermissions(userId).then((perms) => {
      const full: PermissionsMap = {};
      for (const s of SCREENS) {
        full[s.key] = perms[s.key] ?? { ...FULL_ACCESS };
      }
      setDraft(full);
      setLoading(false);
    });
  }, [userId]);

  function toggle(key: ScreenKey, field: "can_view" | "can_edit" | "can_delete") {
    setDraft((prev) => ({
      ...prev,
      [key]: { ...prev[key]!, [field]: !prev[key]![field] },
    }));
  }

  async function handleSalvar() {
    setSalvando(true);
    setErro("");
    try {
      await saveUserPermissions(userId, draft);
      setSucesso("Permissões salvas.");
      setTimeout(() => setSucesso(""), 2500);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return <p className="py-4 text-sm text-gray-400">Carregando permissões...</p>;
  }

  return (
    <div className="mt-3 rounded-2xl border border-folk/20 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Permissões — {userName}</p>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">
          Fechar
        </button>
      </div>

      <div className="space-y-4">
        {SCREEN_GROUPS.map((group) => (
          <div key={group}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {group}
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="py-2 pl-4 pr-2 text-left text-xs font-semibold text-gray-500">
                      Tela
                    </th>
                    <th className="w-24 py-2 text-center text-xs font-semibold text-gray-500">
                      Visualiza
                    </th>
                    <th className="w-24 py-2 text-center text-xs font-semibold text-gray-500">
                      Edita
                    </th>
                    <th className="w-24 py-2 pr-4 text-center text-xs font-semibold text-gray-500">
                      Exclui
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SCREENS.filter((s) => s.group === group).map((s) => {
                    const p = draft[s.key] ?? FULL_ACCESS;
                    return (
                      <tr
                        key={s.key}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="py-2.5 pl-4 pr-2 text-sm text-gray-700">
                          {s.label}
                        </td>
                        <td className="py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={p.can_view}
                            onChange={() => toggle(s.key, "can_view")}
                            className="h-4 w-4 rounded border-gray-300 accent-folk"
                          />
                        </td>
                        <td className="py-2.5 text-center">
                          {s.hasEdit ? (
                            <input
                              type="checkbox"
                              checked={p.can_edit}
                              onChange={() => toggle(s.key, "can_edit")}
                              className="h-4 w-4 rounded border-gray-300 accent-folk"
                            />
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-center">
                          {s.hasDelete ? (
                            <input
                              type="checkbox"
                              checked={p.can_delete}
                              onChange={() => toggle(s.key, "can_delete")}
                              className="h-4 w-4 rounded border-gray-300 accent-folk"
                            />
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="rounded-xl bg-folk px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar permissões"}
        </button>
        {erro    && <p className="text-sm text-red-600">{erro}</p>}
        {sucesso && <p className="text-sm text-green-600">{sucesso}</p>}
      </div>
    </div>
  );
}
