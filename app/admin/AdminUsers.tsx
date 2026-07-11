"use client";

import { useState, useMemo } from "react";
import UserDrawer from "./UserDrawer";
import type { ProfileExtended, PerfilSistema, StatusVisual } from "@/lib/profiles";
import { getStatusVisual, getInitials, formatUltimoAcesso } from "@/lib/profiles";

// ── Helpers ───────────────────────────────────────────────────

const STATUS_STYLE: Record<StatusVisual, { bg: string; dot: string; label: string }> = {
  ativo:    { bg: "bg-green-100",  dot: "bg-green-500",  label: "Ativo"    },
  pendente: { bg: "bg-yellow-100", dot: "bg-yellow-500", label: "Pendente" },
  recusado: { bg: "bg-red-100",    dot: "bg-red-500",    label: "Recusado" },
  inativo:  { bg: "bg-gray-100",   dot: "bg-gray-400",   label: "Inativo"  },
};

type SortField = "nome" | "created_at" | "ultimo_acesso" | "status";
type SortDir   = "asc" | "desc";

const PAGE_SIZE = 20;

// ── KPI Card ──────────────────────────────────────────────────

function KpiCard({
  label, count, active, onClick,
}: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col rounded-2xl border px-5 py-4 text-left transition-all hover:shadow-sm ${
        active
          ? "border-folk/30 bg-folk/5 shadow-sm"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <span className="text-2xl font-bold text-gray-900">{count}</span>
      <span className={`mt-0.5 text-xs font-semibold ${active ? "text-folk" : "text-gray-500"}`}>
        {label}
      </span>
    </button>
  );
}

// ── Coluna ordenável ──────────────────────────────────────────

function SortHeader({
  label, field, current, dir, onSort,
}: { label: string; field: SortField; current: SortField; dir: SortDir; onSort: (f: SortField) => void }) {
  const active = current === field;
  return (
    <th
      className="cursor-pointer py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 select-none hover:text-gray-700"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active && <span className="text-folk">{dir === "asc" ? "↑" : "↓"}</span>}
      </span>
    </th>
  );
}

// ── Componente principal ──────────────────────────────────────

interface Props {
  users:         ProfileExtended[];
  perfisSistema: PerfilSistema[];
}

export default function AdminUsers({ users, perfisSistema }: Props) {
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusVisual | "todos">("todos");
  const [perfilFilter, setPerfilFilter] = useState<string>("todos");
  const [sortField,    setSortField]    = useState<SortField>("created_at");
  const [sortDir,      setSortDir]      = useState<SortDir>("desc");
  const [page,         setPage]         = useState(1);
  const [selectedId,   setSelectedId]   = useState<string | null>(null);

  const selectedUser = users.find((u) => u.id === selectedId) ?? null;

  // ── Contadores para KPIs ──
  const counts = useMemo(() => ({
    total:    users.length,
    ativo:    users.filter((u) => getStatusVisual(u) === "ativo").length,
    pendente: users.filter((u) => getStatusVisual(u) === "pendente").length,
    recusado: users.filter((u) => getStatusVisual(u) === "recusado").length,
    inativo:  users.filter((u) => getStatusVisual(u) === "inativo").length,
  }), [users]);

  // ── Filtro + sort ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users
      .filter((u) => {
        const matchSearch = !q || u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
        const matchStatus = statusFilter === "todos" || getStatusVisual(u) === statusFilter;
        const matchPerfil = perfilFilter === "todos" || u.perfil_id === perfilFilter;
        return matchSearch && matchStatus && matchPerfil;
      })
      .sort((a, b) => {
        let va: string | number | null, vb: string | number | null;
        if (sortField === "nome")          { va = a.nome;          vb = b.nome; }
        else if (sortField === "status")   { va = getStatusVisual(a); vb = getStatusVisual(b); }
        else if (sortField === "ultimo_acesso") { va = a.ultimo_acesso ?? ""; vb = b.ultimo_acesso ?? ""; }
        else                               { va = a.created_at;    vb = b.created_at; }
        if (va === vb) return 0;
        const cmp = (va ?? "") < (vb ?? "") ? -1 : 1;
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [users, search, statusFilter, perfilFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
    setPage(1);
  }

  function handleFilterStatus(sv: StatusVisual | "todos") {
    setStatusFilter(sv);
    setPage(1);
  }

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Usuários</h2>
        <p className="text-sm text-gray-500">Gerencie os usuários, perfis e acessos ao sistema.</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiCard label="Total"     count={counts.total}    active={statusFilter === "todos"}    onClick={() => handleFilterStatus("todos")}    />
        <KpiCard label="Ativos"    count={counts.ativo}    active={statusFilter === "ativo"}    onClick={() => handleFilterStatus("ativo")}    />
        <KpiCard label="Pendentes" count={counts.pendente} active={statusFilter === "pendente"} onClick={() => handleFilterStatus("pendente")} />
        <KpiCard label="Recusados" count={counts.recusado} active={statusFilter === "recusado"} onClick={() => handleFilterStatus("recusado")} />
        <KpiCard label="Inativos"  count={counts.inativo}  active={statusFilter === "inativo"}  onClick={() => handleFilterStatus("inativo")}  />
      </div>

      {/* ── Busca + Filtros ── */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Pesquisar por nome ou e-mail..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => handleFilterStatus(e.target.value as StatusVisual | "todos")}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10"
        >
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="pendente">Pendentes</option>
          <option value="recusado">Recusados</option>
          <option value="inativo">Inativos</option>
        </select>

        <select
          value={perfilFilter}
          onChange={(e) => { setPerfilFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10"
        >
          <option value="todos">Todos os perfis</option>
          <option value="">Sem perfil</option>
          {perfisSistema.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </div>

      {/* ── Tabela ── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
          Nenhum usuário encontrado com os filtros aplicados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr className="border-b border-gray-100">
                <th className="py-3 pl-6 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-10" />
                <SortHeader label="Nome"          field="nome"          current={sortField} dir={sortDir} onSort={handleSort} />
                <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Perfil</th>
                <SortHeader label="Status"        field="status"        current={sortField} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Cadastro"      field="created_at"    current={sortField} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Último acesso" field="ultimo_acesso" current={sortField} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {paged.map((u) => {
                const sv  = getStatusVisual(u);
                const st  = STATUS_STYLE[sv];
                return (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedId(u.id)}
                    className={`cursor-pointer border-b border-gray-100 last:border-0 transition-colors hover:bg-gray-50/60 ${
                      selectedId === u.id ? "bg-folk/5" : ""
                    }`}
                  >
                    {/* Avatar */}
                    <td className="py-3.5 pl-6 pr-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: u.perfil?.cor ?? "#9CA3AF" }}
                      >
                        {getInitials(u.nome)}
                      </div>
                    </td>

                    {/* Nome + email */}
                    <td className="py-3.5 pr-4">
                      <p className="text-sm font-semibold text-gray-900">{u.nome}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>

                    {/* Perfil */}
                    <td className="py-3.5 pr-4">
                      {u.perfil ? (
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                          style={{ backgroundColor: u.perfil.cor }}
                        >
                          {u.perfil.nome}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 pr-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.bg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        <span className="text-gray-700">{st.label}</span>
                      </span>
                    </td>

                    {/* Cadastro */}
                    <td className="py-3.5 pr-4 text-xs text-gray-500">
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </td>

                    {/* Último acesso */}
                    <td className="py-3.5 pr-6 text-xs text-gray-500">
                      {formatUltimoAcesso(u.ultimo_acesso)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Paginação ── */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            {filtered.length} usuário{filtered.length !== 1 ? "s" : ""} —{" "}
            mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              ← Anterior
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    p === page
                      ? "bg-folk text-white"
                      : "border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* ── Drawer ── */}
      {selectedUser && (
        <UserDrawer
          user={selectedUser}
          perfisSistema={perfisSistema}
          onClose={() => setSelectedId(null)}
        />
      )}
    </section>
  );
}
