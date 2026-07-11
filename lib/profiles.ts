export type UserStatus = "pendente" | "aprovado" | "recusado";
export type UserRole   = "user" | "admin";
export type StatusVisual = "ativo" | "pendente" | "recusado" | "inativo";

export interface Profile {
  id:         string;
  nome:       string;
  email:      string;
  role:       UserRole;
  status:     UserStatus;
  created_at: string;
}

export interface PerfilSistema {
  id:        string;
  nome:      string;
  descricao: string | null;
  cor:       string;
  ordem:     number;
}

export interface ProfileExtended extends Profile {
  perfil_id:         string | null;
  perfil:            PerfilSistema | null;
  ativo:             boolean;
  data_inativacao:   string | null;
  motivo_inativacao: string | null;
  ultimo_acesso:     string | null;
}

export function getStatusVisual(u: ProfileExtended): StatusVisual {
  if (!u.ativo) return "inativo";
  if (u.status === "aprovado") return "ativo";
  return u.status;
}

export function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatUltimoAcesso(iso: string | null): string {
  if (!iso) return "Nunca acessou";
  const d = new Date(iso);
  const agora = new Date();
  const diffMs = agora.getTime() - d.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDias === 0) {
    return `Hoje às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (diffDias === 1) {
    return `Ontem às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (diffDias < 30) return `há ${diffDias} dias`;
  if (diffDias < 365) return `há ${Math.floor(diffDias / 30)} meses`;
  return `há ${Math.floor(diffDias / 365)} anos`;
}
