import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// ── Tipos ─────────────────────────────────────────────────────

type CheckResult = { name: string; ok: boolean; detail?: string };

// ── Helpers ───────────────────────────────────────────────────

type AdminClient = ReturnType<typeof createAdminSupabase>;

async function checkTable(name: string, admin: AdminClient): Promise<CheckResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from(name as any) as any).select("*").limit(0);
  if (error) return { name, ok: false, detail: error.message };
  return { name, ok: true };
}

async function checkColumn(table: string, column: string, admin: AdminClient): Promise<CheckResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from(table as any) as any).select(column).limit(0);
  if (error) return { name: `${table}.${column}`, ok: false, detail: error.message };
  return { name: `${table}.${column}`, ok: true };
}

async function checkSeedCount(
  table: string,
  column: string,
  minCount: number,
  admin: AdminClient,
): Promise<CheckResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (admin.from(table as any) as any)
    .select(column, { count: "exact", head: true });
  if (error) return { name: `${table} (seed)`, ok: false, detail: error.message };
  const ok = (count ?? 0) >= minCount;
  return {
    name: `${table} (seed)`,
    ok,
    detail: ok ? `${count} registros` : `${count} registros — esperado ≥ ${minCount}`,
  };
}

async function checkRpcExists(fnName: string, admin: AdminClient): Promise<CheckResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.rpc as any)(fnName, {});
  // Se a função não existe: error.code === "PGRST202"
  // Se existe mas parâmetros errados: outro código de erro — consideramos OK
  if (error && error.code === "PGRST202") {
    return { name: `fn: ${fnName}`, ok: false, detail: "Função não encontrada" };
  }
  return { name: `fn: ${fnName}`, ok: true };
}

// ── Seções de verificação ─────────────────────────────────────

const EC_TABLES = [
  "ec_categorias_produto",
  "ec_fabricantes",
  "ec_catalogo_itens",
  "ec_fornecedores",
  "ec_produto_fornecedor",
  "ec_kits",
  "ec_kit_itens",
  "ec_regras_composicao",
  "ec_solucoes",
  "ec_solucao_kits",
  "ec_parametros_financeiros",
  "ec_templates",
  "ec_propostas",
  "ec_versoes",
  "ec_projeto_dados",
  "ec_necessidades",
  "ec_premissas",
  "ec_versao_solucoes",
  "ec_custos_proposta",
  "ec_lista_materiais",
  "ec_precificacao",
  "ec_historico_versoes",
];

const SYSTEM_TABLES = ["profiles", "screen_permissions", "profiles_system"];

const EC_VIEWS = ["ec_visao_executiva", "ec_solucao_itens_view"];

// ── Componentes ───────────────────────────────────────────────

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
        ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
      }`}
    >
      {ok ? "✓ OK" : "✗ FALHA"}
    </span>
  );
}

function Section({ title, checks }: { title: string; checks: CheckResult[] }) {
  const allOk = checks.every((c) => c.ok);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div
        className={`flex items-center justify-between border-b px-4 py-3 ${
          allOk ? "border-gray-100 bg-gray-50" : "border-red-100 bg-red-50"
        }`}
      >
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        <StatusBadge ok={allOk} />
      </div>
      <ul className="divide-y divide-gray-50">
        {checks.map((c) => (
          <li key={c.name} className="flex items-center justify-between px-4 py-2.5">
            <span className="font-mono text-xs text-gray-600">{c.name}</span>
            <div className="flex items-center gap-2">
              {c.detail && (
                <span className={`text-xs ${c.ok ? "text-gray-400" : "text-red-600"}`}>
                  {c.detail}
                </span>
              )}
              <StatusBadge ok={c.ok} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default async function HealthPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const admin = createAdminSupabase();

  const [ecTableResults, systemTableResults, ecViewResults] = await Promise.all([
    Promise.all(EC_TABLES.map((t) => checkTable(t, admin))),
    Promise.all(SYSTEM_TABLES.map((t) => checkTable(t, admin))),
    Promise.all(EC_VIEWS.map((t) => checkTable(t, admin))),
  ]);

  const [columnCheck, seedCheck, fnParametros] = await Promise.all([
    checkColumn("ec_versoes", "necessita_recalculo", admin),
    checkSeedCount("ec_parametros_financeiros", "chave", 19, admin),
    checkRpcExists("ec_parametros_json", admin),
  ]);

  const integrityChecks: CheckResult[] = [columnCheck, seedCheck, fnParametros];

  const allChecks = [
    ...ecTableResults,
    ...systemTableResults,
    ...ecViewResults,
    ...integrityChecks,
  ];
  const globalOk = allChecks.every((c) => c.ok);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Health Check</h1>
          <p className="mt-1 text-sm text-gray-500">
            Verificação estrutural · {new Date().toLocaleString("pt-BR")}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            globalOk ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
          }`}
        >
          {globalOk ? "✓ Sistema íntegro" : "✗ Problemas detectados"}
        </span>
      </div>

      <Section title="Tabelas — Engenharia Comercial" checks={ecTableResults} />
      <Section title="Views — Engenharia Comercial" checks={ecViewResults} />
      <Section title="Tabelas — Sistema" checks={systemTableResults} />
      <Section title="Integridade e funções" checks={integrityChecks} />

      <p className="text-center text-xs text-gray-400">
        Folk v1.0.0 · Acesso restrito a administradores
      </p>
    </div>
  );
}
