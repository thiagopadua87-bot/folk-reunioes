import { supabase } from "@/lib/supabase";

// ── Tipos ─────────────────────────────────────────────────────

export type ScreenKey =
  | "reunioes"
  | "comercial.pipeline"
  | "comercial.vendas"
  | "comercial.dashboard"
  | "comercial.comissoes"
  | "comercial.comissoes.dashboard"
  | "comercial.comissoes.regras"
  | "comercial.comissoes.competencias"
  | "comercial.comissoes.relatorios"
  | "obras.andamento"
  | "obras.concluidas"
  | "obras.dashboard"
  | "projetos.andamento"
  | "projetos.concluidos"
  | "projetos.dashboard"
  | "cobranca.clientes"
  | "cobranca.dashboard"
  | "cobranca.configuracoes"
  | "cadastros.vendedores"
  | "cadastros.tecnicos"
  | "cadastros.terceirizados"
  | "cadastros.concorrentes"
  | "cadastros.motivos_perda"
  | "cadastros.sindicos_gestores";

export interface ScreenPermission {
  can_view:   boolean;
  can_edit:   boolean;
  can_delete: boolean;
}

export type PermissionsMap = Partial<Record<ScreenKey, ScreenPermission>>;

export const FULL_ACCESS: ScreenPermission = { can_view: true, can_edit: true, can_delete: true };

// ── Definição das telas ───────────────────────────────────────

export interface ScreenDef {
  key:       ScreenKey;
  label:     string;
  group:     string;
  hasEdit:   boolean;
  hasDelete: boolean;
}

export const SCREENS: ScreenDef[] = [
  { key: "reunioes",                  label: "Reuniões",         group: "Reuniões",  hasEdit: true,  hasDelete: true  },
  { key: "comercial.pipeline",        label: "Pipeline",         group: "Comercial", hasEdit: true,  hasDelete: true  },
  { key: "comercial.vendas",          label: "Vendas",           group: "Comercial", hasEdit: true,  hasDelete: true  },
  { key: "comercial.dashboard",       label: "Dashboard",        group: "Comercial", hasEdit: false, hasDelete: false },
  { key: "comercial.comissoes",              label: "Comissões",        group: "Comercial", hasEdit: false, hasDelete: false },
  { key: "comercial.comissoes.dashboard",   label: "Dashboard",        group: "Comissões", hasEdit: false, hasDelete: false },
  { key: "comercial.comissoes.regras",      label: "Regras",           group: "Comissões", hasEdit: true,  hasDelete: false },
  { key: "comercial.comissoes.competencias", label: "Competências",    group: "Comissões", hasEdit: true,  hasDelete: false },
  { key: "comercial.comissoes.relatorios",  label: "Relatórios",       group: "Comissões", hasEdit: false, hasDelete: false },
  { key: "obras.andamento",           label: "Em andamento",     group: "Obras",     hasEdit: true,  hasDelete: true  },
  { key: "obras.concluidas",          label: "Concluídas",       group: "Obras",     hasEdit: true,  hasDelete: true  },
  { key: "obras.dashboard",           label: "Dashboard",        group: "Obras",     hasEdit: false, hasDelete: false },
  { key: "projetos.andamento",        label: "Em andamento",     group: "Projetos",  hasEdit: true,  hasDelete: true  },
  { key: "projetos.concluidos",       label: "Concluídos",       group: "Projetos",  hasEdit: true,  hasDelete: true  },
  { key: "projetos.dashboard",        label: "Dashboard",        group: "Projetos",  hasEdit: false, hasDelete: false },
  { key: "cobranca.clientes",         label: "Clientes",         group: "Cobrança",  hasEdit: true,  hasDelete: false },
  { key: "cobranca.dashboard",        label: "Dashboard",        group: "Cobrança",  hasEdit: false, hasDelete: false },
  { key: "cobranca.configuracoes",    label: "Configurações",    group: "Cobrança",  hasEdit: true,  hasDelete: false },
  { key: "cadastros.vendedores",      label: "Vendedores",       group: "Cadastros", hasEdit: true,  hasDelete: false },
  { key: "cadastros.tecnicos",        label: "Técnicos",         group: "Cadastros", hasEdit: true,  hasDelete: false },
  { key: "cadastros.terceirizados",   label: "Terceirizados",    group: "Cadastros", hasEdit: true,  hasDelete: false },
  { key: "cadastros.concorrentes",    label: "Concorrentes",     group: "Cadastros", hasEdit: true,  hasDelete: false },
  { key: "cadastros.motivos_perda",   label: "Motivos de Perda", group: "Cadastros", hasEdit: true,  hasDelete: false },
  { key: "cadastros.sindicos_gestores", label: "Síndicos/Gestores", group: "Cadastros", hasEdit: true, hasDelete: false },
];

// ── Grupos para exibição ──────────────────────────────────────

export const SCREEN_GROUPS = [...new Set(SCREENS.map((s) => s.group))];

// ── Data access ───────────────────────────────────────────────

export async function fetchUserPermissions(userId: string): Promise<PermissionsMap> {
  const { data, error } = await supabase
    .from("screen_permissions")
    .select("screen_key, can_view, can_edit, can_delete")
    .eq("user_id", userId);

  if (error || !data) return {};

  const map: PermissionsMap = {};
  for (const row of data) {
    map[row.screen_key as ScreenKey] = {
      can_view:   row.can_view,
      can_edit:   row.can_edit,
      can_delete: row.can_delete,
    };
  }
  return map;
}

export async function saveUserPermissions(
  userId: string,
  permissions: PermissionsMap,
): Promise<void> {
  const rows = Object.entries(permissions).map(([key, perm]) => ({
    user_id:    userId,
    screen_key: key,
    can_view:   perm!.can_view,
    can_edit:   perm!.can_edit,
    can_delete: perm!.can_delete,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from("screen_permissions")
    .upsert(rows, { onConflict: "user_id,screen_key" });

  if (error) throw new Error(error.message);
}
