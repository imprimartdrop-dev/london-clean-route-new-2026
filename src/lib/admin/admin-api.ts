/** GOODSPOTLESS only. A public publishable key is safe in browser code; RLS controls access. */
export const BACKEND_URL = "https://hrypzfgvjlniuhnglmzm.supabase.co";
export const PUBLISHABLE_KEY =
  import.meta.env["VITE_GOODSPOTLESS_SUPABASE_PUBLISHABLE_KEY"] ||
  "sb_publishable_0qg4xVsivdjgOXp1ouaBcg_Y0NGvVdL";

export type AdminSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

export type AdminTable =
  | "enquiries"
  | "jobs"
  | "cleaning_clients"
  | "cleaning_properties"
  | "cleaning_staff"
  | "cleaning_visits"
  | "finance_entries"
  | "business_partners";

export type RecordRow = {
  id: string;
  reference?: unknown;
  name?: unknown;
  label?: unknown;
  full_name?: unknown;
  postcode?: unknown;
  property_id?: unknown;
  client_id?: unknown;
  staff_id?: unknown;
  description?: unknown;
  amount_pence?: unknown;
  service?: unknown;
  status?: unknown;
  phone_e164?: unknown;
  phone?: unknown;
  email?: unknown;
  address_line1?: unknown;
  active?: unknown;
  entry_date?: unknown;
  category?: unknown;
  kind?: unknown;
  scheduled_date?: unknown;
  start_time?: unknown;
  route_order?: unknown;
  profit_share_percent?: unknown;
  archived_at?: unknown;
  voided_at?: unknown;
  [key: string]: unknown;
};

const SESSION_KEY = "goodspotless_admin_session_v1";

export function loadSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<AdminSession>;
    if (!value.access_token || !value.refresh_token || !value.expires_at) return null;
    return value as AdminSession;
  } catch {
    return null;
  }
}

function saveSession(session: AdminSession | null) {
  if (typeof window === "undefined") return;
  if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(SESSION_KEY);
}

function asSession(data: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}): AdminSession {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

async function responseError(response: Response): Promise<Error> {
  let message = `Erro ${response.status}`;
  try {
    const body = (await response.json()) as {
      msg?: string;
      message?: string;
      error_description?: string;
      code?: string;
    };
    message = body.message || body.error_description || body.msg || message;
  } catch {
    /* Some proxies return non-JSON errors. */
  }
  if (response.status === 401)
    message = "Sessão expirada ou e-mail/senha incorretos. Faça login novamente.";
  if (response.status === 403) message = "Sem permissão para esta operação.";
  return new Error(message);
}

async function authRequest(path: string, payload: Record<string, unknown>) {
  const response = await fetch(`${BACKEND_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await responseError(response);
  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

export async function signIn(email: string, password: string): Promise<AdminSession> {
  const result = await authRequest("token?grant_type=password", { email, password });
  const session = asSession(result);
  saveSession(session);
  return session;
}

/** Signup creates an unprivileged user. Admin approval must happen server-side. */
export async function register(email: string, password: string): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw await responseError(response);
}

let pendingRefresh: Promise<AdminSession> | null = null;

export async function getFreshSession(session: AdminSession): Promise<AdminSession> {
  // Read the latest stored token: a previous request may already have rotated it.
  const current = loadSession() || session;
  if (current.expires_at > Date.now() + 60_000) return current;
  if (!pendingRefresh) {
    pendingRefresh = authRequest("token?grant_type=refresh_token", {
      refresh_token: current.refresh_token,
    })
      .then((data) => {
        const refreshed = asSession(data);
        saveSession(refreshed);
        return refreshed;
      })
      .catch((error: unknown) => {
        saveSession(null);
        throw error;
      })
      .finally(() => {
        pendingRefresh = null;
      });
  }
  return pendingRefresh;
}

export async function signOut(session: AdminSession | null) {
  saveSession(null);
  if (!session) return;
  try {
    await fetch(`${BACKEND_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${session.access_token}` },
    });
  } catch {
    /* The local session has already been destroyed. */
  }
}

export async function requestRows<T extends RecordRow>(
  session: AdminSession,
  table: AdminTable | "user_roles",
  query = "select=*&limit=500",
): Promise<T[]> {
  const fresh = await getFreshSession(session);
  const response = await fetch(`${BACKEND_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${fresh.access_token}` },
    cache: "no-store",
  });
  if (!response.ok) throw await responseError(response);
  return response.json() as Promise<T[]>;
}

export async function isAdminUser(session: AdminSession): Promise<boolean> {
  const roles = await requestRows<{ id: string; role: string }>(
    session,
    "user_roles",
    "select=id,role&role=eq.admin&limit=1",
  );
  return roles.some((row) => row.role === "admin");
}

export async function saveRow(
  session: AdminSession,
  table: AdminTable,
  values: Record<string, unknown>,
  id?: string,
): Promise<RecordRow> {
  const fresh = await getFreshSession(session);
  const response = await fetch(
    `${BACKEND_URL}/rest/v1/${table}${id ? `?id=eq.${encodeURIComponent(id)}` : ""}`,
    {
      method: id ? "PATCH" : "POST",
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${fresh.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(values),
    },
  );
  if (!response.ok) throw await responseError(response);
  const rows = (await response.json()) as RecordRow[];
  if (!rows.length) throw new Error("Nenhum registro alterado. Verifique suas permissões.");
  return rows[0]!;
}

export async function deleteRow(
  session: AdminSession,
  table: AdminTable,
  id: string,
): Promise<void> {
  const fresh = await getFreshSession(session);
  const response = await fetch(`${BACKEND_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${fresh.access_token}` },
  });
  if (!response.ok) throw await responseError(response);
}
