export type UserStatus = "pendente" | "aprovado" | "recusado";
export type UserRole = "user" | "admin";

export interface Profile {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}
