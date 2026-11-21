import { BACKEND_URL, PUBLISHABLE_KEY, getFreshSession, type AdminSession } from "./admin-api";

// Only the public VAPID key belongs in the browser. Never include the private key.
const VAPID_PUBLIC =
  "BFqAXUK81UAb05GK-dCKNoZoQOem2kuLD4Pvpo8EoJuAPgVghhEQ_TnjJPZO7q1JBR6CGloiYip4bUBuhVOKs7w";

export function isInstalledApp(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return iosStandalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function vapidKeyBytes(): Uint8Array<ArrayBuffer> {
  const raw = atob(VAPID_PUBLIC.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function userId(session: AdminSession): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/auth/v1/user`, {
    headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error("Faça login novamente para ativar notificações.");
  const user = (await response.json()) as { id?: string };
  if (!user.id) throw new Error("Usuário não identificado.");
  return user.id;
}

/** Call only from a user click: iOS requires requestPermission to be user initiated. */
export async function activateAdminPush(session: AdminSession): Promise<string> {
  if (!pushSupported()) throw new Error("Este navegador não oferece notificações Web Push.");
  if (!isInstalledApp()) {
    throw new Error("No iPhone, abra o painel pelo ícone da tela inicial antes de ativar.");
  }

  // Keep the request immediately inside the tap handler, before awaiting network work.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Ative as notificações do GOODSPOTLESS nos Ajustes do iPhone.");
  }

  const registration = await navigator.serviceWorker.register("/goodspotless-sw.js", {
    scope: "/",
  });
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKeyBytes(),
    }));
  const keys = subscription.toJSON().keys;
  if (!keys?.["p256dh"] || !keys["auth"])
    throw new Error("Não foi possível registrar este aparelho.");

  const fresh = await getFreshSession(session);
  const id = await userId(fresh);
  const response = await fetch(
    `${BACKEND_URL}/rest/v1/admin_push_subscriptions?on_conflict=endpoint`,
    {
      method: "POST",
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${fresh.access_token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        user_id: id,
        endpoint: subscription.endpoint,
        p256dh: keys["p256dh"],
        auth_key: keys["auth"],
      }),
    },
  );
  if (!response.ok) throw new Error(`Não foi possível salvar a inscrição (${response.status}).`);
  return "Notificações ativadas neste aparelho. Agora teste com o botão abaixo.";
}

/** Sends a real server-side push to the CURRENT admin's devices, not a local preview. */
export async function testAdminPush(session: AdminSession): Promise<string> {
  const fresh = await getFreshSession(session);
  const response = await fetch(`${BACKEND_URL}/functions/v1/goodspotless-push`, {
    method: "POST",
    headers: {
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${fresh.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "test" }),
  });
  if (!response.ok)
    throw new Error("Falha no teste do servidor; confira se o envio push foi ativado.");
  const result = (await response.json()) as { sent?: number; failed?: number };
  if (!result.sent) throw new Error("Nenhum aparelho recebeu o teste; tente ativar novamente.");
  return `Teste enviado pelo servidor a ${result.sent} aparelho(s). Bloqueie a tela no próximo teste para conferir som e vibração.`;
}
