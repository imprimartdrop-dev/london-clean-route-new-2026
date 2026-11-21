/** GOODSPOTLESS only. Send genuine Web Push to authorised admin devices. */
import webpush from "npm:web-push@3.6.7";

// Public VAPID key: safe for client and repository. PRIVATE key is in Supabase Vault.
const VAPID_PUBLIC =
  "BFqAXUK81UAb05GK-dCKNoZoQOem2kuLD4Pvpo8EoJuAPgVghhEQ_TnjJPZO7q1JBR6CGloiYip4bUBuhVOKs7w";

type StoredSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function backend(path: string, options: RequestInit = {}) {
  const secret = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${env("SUPABASE_URL").replace(/\/$/, "")}/${path}`, {
    ...options,
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
  return response.status === 204 ? null : response.json();
}

/** Verify real Supabase user, then verify admin role on the server. */
async function authorisedAdminUser(bearer: string): Promise<string | null> {
  const response = await fetch(`${env("SUPABASE_URL")}/auth/v1/user`, {
    headers: { apikey: env("SUPABASE_SERVICE_ROLE_KEY"), Authorization: bearer },
  });
  if (!response.ok) return null;
  const user = (await response.json()) as { id?: string };
  if (!user.id) return null;
  const roles = (await backend(
    `rest/v1/user_roles?select=role&user_id=eq.${encodeURIComponent(user.id)}&role=eq.admin&limit=1`,
  )) as { role: string }[];
  return roles.length ? user.id : null;
}

async function sendToDevices(userId: string | null, notification: { id: string; body: string }) {
  const keyRows = await backend("rest/v1/rpc/goodspotless_push_vapid_private_key", {
    method: "POST",
    body: "{}",
  });
  if (typeof keyRows !== "string" || !keyRows) throw new Error("Push VAPID secret not configured");
  webpush.setVapidDetails("mailto:gabrielfitness28@gmail.com", VAPID_PUBLIC, keyRows);

  const filters = userId ? `&user_id=eq.${encodeURIComponent(userId)}` : "";
  const subscriptions = (await backend(
    `rest/v1/admin_push_subscriptions?select=id,user_id,endpoint,p256dh,auth_key${filters}&limit=200`,
  )) as StoredSubscription[];
  const payload = JSON.stringify(notification); // No customer name, phone or postcode on lock screen.
  let sent = 0;
  let expired = 0;
  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
          },
          payload,
          { TTL: 300, urgency: "high" },
        );
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await backend(
            `rest/v1/admin_push_subscriptions?id=eq.${encodeURIComponent(subscription.id)}`,
            {
              method: "DELETE",
            },
          );
          expired += 1;
        } else {
          console.error("GOODSPOTLESS web push delivery failed", statusCode || "unknown");
          throw error;
        }
      }
    }),
  );
  const failed = results.filter((result) => result.status === "rejected").length;
  return { devices: subscriptions.length, sent, expired, failed };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return reply(401, { error: "Authorization required" });
    if (Number(req.headers.get("Content-Length") || 0) > 1500)
      return reply(413, { error: "Payload too large" });
    const internalKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const isInternal = auth === `Bearer ${internalKey}`;
    const raw = await req.text();
    if (raw.length > 1500) return reply(413, { error: "Payload too large" });
    const body = JSON.parse(raw) as { action?: string; enquiry_id?: string };

    if (
      isInternal &&
      body.action === "enquiry" &&
      typeof body.enquiry_id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(body.enquiry_id)
    ) {
      const enquiry = (await backend(
        `rest/v1/enquiries?select=id&id=eq.${encodeURIComponent(body.enquiry_id)}&limit=1`,
      )) as { id: string }[];
      if (enquiry.length !== 1) return reply(404, { error: "Enquiry not found" });
      return reply(
        200,
        await sendToDevices(null, {
          id: body.enquiry_id,
          body: "Chegou uma nova solicitação. Abra o painel para atender.",
        }),
      );
    }

    if (!isInternal && body.action === "test") {
      const userId = await authorisedAdminUser(auth);
      if (!userId) return reply(403, { error: "Administrator access required" });
      return reply(
        200,
        await sendToDevices(userId, {
          id: `test-${crypto.randomUUID()}`,
          body: "Este é um teste real de notificação. Abra o painel GOODSPOTLESS.",
        }),
      );
    }
    return reply(403, { error: "Forbidden" });
  } catch (error) {
    console.error(
      "GOODSPOTLESS push server error",
      error instanceof Error ? error.message : "unknown",
    );
    return reply(503, { error: "Push temporarily unavailable" });
  }
});
