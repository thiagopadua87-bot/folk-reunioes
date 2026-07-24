"use client";

import { useState, useMemo, useEffect, useId, useCallback, type ReactNode } from "react";

// ── CSS constants ─────────────────────────────────────────────
export const INPUT     = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-folk focus:ring-2 focus:ring-folk/10 w-full";
export const LABEL     = "text-xs font-semibold uppercase tracking-wide text-gray-500";
export const FOLK_BTN  = "rounded-2xl bg-folk-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60";
export const GHOST_BTN = "rounded-2xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300";

// ── useCrudLoader ─────────────────────────────────────────────
// Elimina boilerplate de loading+erro+carregar+useEffect nos tabs.

export function useCrudLoader<T>(
  loader: () => Promise<T[]>,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  deps: React.DependencyList,
): { data: T[]; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData]     = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try { setData(await loader()); setError(null); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { reload(); }, [reload]);

  return { data, loading, error, reload };
}

// ── Badge ─────────────────────────────────────────────────────

const BADGE_COLORS: Record<string, string> = {
  green:  "bg-green-50 text-green-700 border-green-200",
  red:    "bg-red-50 text-red-700 border-red-200",
  gray:   "bg-gray-100 text-gray-500 border-gray-200",
  blue:   "bg-blue-50 text-blue-700 border-blue-200",
  folk:   "bg-folk/10 text-folk border-folk/20",
  amber:  "bg-amber-50 text-amber-700 border-amber-100",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
};

export function Badge({ label, color = "gray" }: { label: string; color?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${BADGE_COLORS[color] ?? BADGE_COLORS.gray}`}>
      {label}
    </span>
  );
}

export function BadgeAtivo({ ativo }: { ativo: boolean }) {
  return <Badge label={ativo ? "Ativo" : "Inativo"} color={ativo ? "green" : "gray"} />;
}

// ── SaveBanner ────────────────────────────────────────────────

export function SaveBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
      Registro salvo com sucesso.
    </div>
  );
}

// ── FilterBar ─────────────────────────────────────────────────

interface FilterBarProps {
  busca: string;
  onBuscaChange: (v: string) => void;
  ativo: boolean | null;
  onAtivoChange: (v: boolean | null) => void;
  placeholder?: string;
  extra?: ReactNode;
}

export function FilterBar({ busca, onBuscaChange, ativo, onAtivoChange, placeholder, extra }: FilterBarProps) {
  return (
    <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[200px] flex-1">
          <input
            type="text"
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            placeholder={placeholder ?? "Pesquisar..."}
            className={INPUT}
          />
        </div>
        <div className="w-40">
          <select
            value={ativo == null ? "" : String(ativo)}
            onChange={(e) => onAtivoChange(e.target.value === "" ? null : e.target.value === "true")}
            className={INPUT}
          >
            <option value="">Todos</option>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>
        {extra}
      </div>
    </div>
  );
}

// ── DataTable ─────────────────────────────────────────────────

export interface ColumnDef<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
}

interface DataTableProps<T extends { id: string; ativo?: boolean }> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onEdit?: (row: T) => void;
  onToggle?: (row: T) => void;
  extraActions?: (row: T) => ReactNode;
  canEdit?: boolean;
  pageSize?: number;
}

const PAGE_SIZE = 20;

export function DataTable<T extends { id: string; ativo?: boolean }>({
  data,
  columns,
  loading,
  error,
  emptyMessage = "Nenhum registro encontrado.",
  onEdit,
  onToggle,
  extraActions,
  canEdit = true,
  pageSize = PAGE_SIZE,
}: DataTableProps<T>) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage]       = useState(0);

  // Reseta página quando os dados mudam (ex: novo filtro retorna menos páginas)
  useEffect(() => { setPage(0); }, [data]);

  function handleSort(key: string) {
    if (sortCol === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(key); setSortDir("asc"); }
    setPage(0);
  }

  const sorted = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const va  = String((a as Record<string, unknown>)[sortCol] ?? "");
      const vb  = String((b as Record<string, unknown>)[sortCol] ?? "");
      const cmp = va.localeCompare(vb, "pt-BR", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortCol, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged      = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const hasActions = canEdit && (onEdit || onToggle || extraActions);

  if (loading) return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-gray-100 px-6 py-4 last:border-0">
          <div className="h-4 w-1/3 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-4 w-1/4 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-4 w-1/5 animate-pulse rounded-lg bg-gray-100" />
        </div>
      ))}
    </div>
  );

  if (error) return (
    <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700">{error}</div>
  );

  if (data.length === 0) return (
    <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">{emptyMessage}</div>
  );

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 first:pl-6 last:pr-6 ${col.sortable !== false ? "cursor-pointer select-none hover:text-gray-700" : ""}`}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && sortCol === col.key && (
                      <span className="text-folk">{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </span>
                </th>
              ))}
              {hasActions && (
                <th className="py-3 pr-6 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ações</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-gray-50/50">
                {columns.map((col) => (
                  <td key={col.key} className="py-3.5 pl-4 pr-3 text-sm first:pl-6 last:pr-6">
                    {col.render
                      ? col.render(row)
                      : <span className="text-gray-700">{String((row as Record<string, unknown>)[col.key] ?? "—")}</span>
                    }
                  </td>
                ))}
                {hasActions && (
                  <td className="py-3.5 pr-6">
                    <div className="flex items-center gap-2">
                      {canEdit && onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-folk/30 hover:text-folk"
                        >
                          Editar
                        </button>
                      )}
                      {canEdit && onToggle && row.ativo !== undefined && (
                        <button
                          onClick={() => onToggle(row)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            row.ativo
                              ? "border-amber-100 text-amber-600 hover:bg-amber-50"
                              : "border-green-100 text-green-600 hover:bg-green-50"
                          }`}
                        >
                          {row.ativo ? "Inativar" : "Ativar"}
                        </button>
                      )}
                      {extraActions?.(row)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
          <span>{page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} de {sorted.length}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40 hover:border-gray-300"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40 hover:border-gray-300"
            >
              Próximo →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SubListSkeleton ───────────────────────────────────────────
// Skeleton para sub-editores (KitItens, ProdutoFornecedor, etc.)

export function SubListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-gray-100 px-5 py-3.5 last:border-0">
          <div className="h-3.5 w-1/3 animate-pulse rounded-md bg-gray-100" />
          <div className="h-3.5 w-1/4 animate-pulse rounded-md bg-gray-100" />
          <div className="h-3.5 w-1/5 animate-pulse rounded-md bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

// ── FormLayout ────────────────────────────────────────────────

interface FormLayoutProps {
  title: string;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
  salvando: boolean;
  erro: string | null;
  isNew: boolean;
  submitLabel?: string;
  children: ReactNode;
  extra?: ReactNode;
}

export function FormLayout({
  title, onBack, onSubmit, salvando, erro, isNew, submitLabel, children, extra,
}: FormLayoutProps) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-sm text-gray-400 transition-colors hover:text-gray-600">
          ← Voltar
        </button>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {children}

          {erro && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:col-span-2">
              {erro}
            </div>
          )}

          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={salvando} className={FOLK_BTN}>
              {salvando ? "Salvando..." : (submitLabel ?? (isNew ? "Cadastrar" : "Salvar alterações"))}
            </button>
            <button type="button" onClick={onBack} className={GHOST_BTN}>
              Cancelar
            </button>
          </div>
        </form>

        {extra}
      </div>
    </div>
  );
}

// ── Field helpers ─────────────────────────────────────────────

export function Field({
  label, required, span2, children,
}: {
  label: string;
  required?: boolean;
  span2?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5${span2 ? " sm:col-span-2" : ""}`}>
      <label className={LABEL}>{label}{required && " *"}</label>
      {children}
    </div>
  );
}

export function AtivoField({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const uid = useId();
  return (
    <div className="flex items-center gap-3 sm:col-span-2">
      <input
        type="checkbox"
        id={uid}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 accent-folk"
      />
      <label htmlFor={uid} className="text-sm text-gray-700">Ativo</label>
    </div>
  );
}

// ── CrudHeader ────────────────────────────────────────────────

export function CrudHeader({
  total, loading, onNovo, novoLabel, canEdit,
}: {
  total: number;
  loading: boolean;
  onNovo: () => void;
  novoLabel: string;
  canEdit: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <p className="text-sm text-gray-500">
        {loading ? "Carregando..." : `${total} registro${total !== 1 ? "s" : ""}`}
      </p>
      {canEdit && (
        <button onClick={onNovo} className={FOLK_BTN}>
          + {novoLabel}
        </button>
      )}
    </div>
  );
}
