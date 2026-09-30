import { reactive } from "vue";

export interface Preferences {
  nickname: string;
  companion_name: string;
  presentation: string;
  addressing: string;
  interests: string;
  share_local: boolean;
  share_online: boolean;
}
export interface Owner {
  user_id: string;
  age_profile: string;
  preferences: Preferences | null;
}
export interface Status {
  configured: boolean;
  owner: Owner | null;
  providers: { local: boolean; online: boolean };
  hardware: string;
}
export interface Memory {
  id: string;
  content: string;
  confidential: boolean;
  created_at: string;
  updated_at: string;
}
export interface Page {
  items: Memory[];
  total: number;
}
export interface Temporary {
  id: string;
  content: string;
  tier: string;
  created: string;
  expires: string;
}
export interface Profile {
  address: string;
  city: string;
  district: string;
  preferences: string;
  local_sharing: string;
  online_sharing: string;
}
export interface Person {
  personne: string;
  cle: string;
  identite_a_confirmer: boolean;
  suite: number | null;
  relations: { relation: string; source: string }[];
  sources: {
    id: string;
    contenu: string;
    confidentiel: boolean;
    enregistre_le: string;
  }[];
  points_a_verifier: { sujet: string; statut: string }[];
}
export interface Schedule {
  work_days: number[];
  work_start: number;
  work_end: number;
  leisure_days: number[];
  leisure_start: number;
  leisure_end: number;
  quiet_start: number;
  quiet_end: number;
}
export const defaults = (): Preferences => ({
  nickname: "",
  companion_name: "Companion",
  presentation: "neutre",
  addressing: "tu",
  interests: "",
  share_local: false,
  share_online: false,
});
export const state = reactive({
  status: null as Status | null,
  online: false,
  loading: false,
  notice: "",
  error: "",
});

export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: {
        "X-Companion-Admin": "1",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(path === "/chat" ? 240000 : 15000),
    });
  } catch {
    throw new Error(
      "API inaccessible ou délai dépassé. Vérifiez le service Companion, puis actualisez avant de réessayer.",
    );
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : `Le service a répondu avec une erreur (${response.status}).`,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export async function action(operation: () => Promise<void>, success = "") {
  state.error = "";
  state.notice = "";
  try {
    await operation();
    state.notice = success;
    return true;
  } catch (error) {
    state.error =
      error instanceof Error ? error.message : "Une erreur est survenue.";
    return false;
  }
}

export async function refreshStatus() {
  state.loading = true;
  try {
    state.status = await api<Status>("/status");
    state.online = true;
  } catch (error) {
    state.online = false;
    throw error;
  } finally {
    state.loading = false;
  }
}

export const date = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
export const ageLabel = (value?: string) =>
  ({ adulte: "Adulte", ado: "Adolescent", enfant: "Enfant" })[value ?? ""] ??
  "Non configuré";
