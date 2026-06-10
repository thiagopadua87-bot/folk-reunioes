import { google } from "googleapis";

function normalizePrivateKey(raw: string): string {
  // Remove aspas extras que o Vercel/shell pode adicionar
  let k = raw.trim().replace(/^"+|"+$/g, "");
  // Se ainda tiver \n literais (dois caracteres), converte para quebra real
  if (!k.includes("\n")) k = k.replace(/\\n/g, "\n");
  return k;
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const raw   = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !raw) throw new Error("Credenciais Google não configuradas.");

  const key = normalizePrivateKey(raw);

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
}

export interface EventoCalendario {
  calendarId:  string;
  eventId?:    string;
  titulo:      string;
  descricao:   string;
  inicio:      string; // ISO datetime
  fim?:        string; // ISO datetime — se omitido usa inicio + 1h
  convidados?: string[];
}

function fimPadrao(inicio: string): string {
  const d = new Date(inicio);
  d.setHours(d.getHours() + 1);
  return d.toISOString();
}

export async function criarOuAtualizarEvento(ev: EventoCalendario): Promise<string> {
  const auth     = getAuth();
  const calendar = google.calendar({ version: "v3", auth });

  const resource = {
    summary:     ev.titulo,
    description: ev.descricao,
    start: { dateTime: ev.inicio, timeZone: "America/Sao_Paulo" },
    end:   { dateTime: ev.fim ?? fimPadrao(ev.inicio), timeZone: "America/Sao_Paulo" },
    attendees: (ev.convidados ?? []).map((email) => ({ email })),
  };

  if (ev.eventId) {
    const res = await calendar.events.update({
      calendarId:  ev.calendarId,
      eventId:     ev.eventId,
      requestBody: resource,
    });
    return res.data.id!;
  }

  const res = await calendar.events.insert({
    calendarId:  ev.calendarId,
    requestBody: resource,
  });
  return res.data.id!;
}

export async function excluirEvento(calendarId: string, eventId: string): Promise<void> {
  const auth     = getAuth();
  const calendar = google.calendar({ version: "v3", auth });
  await calendar.events.delete({ calendarId, eventId }).catch(() => {});
}
