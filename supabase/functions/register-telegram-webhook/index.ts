/**
 * GOODSPOTLESS — temporary, one-time webhook registration helper.
 *
 * Deploy ONLY to Supabase project hrypzfgvjlniuhnglmzm with Verify JWT OFF.
 * Requires TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET already stored
 * as Supabase Edge Function secrets. Never paste these values into source.
 *
 * Invoke with POST and header:
 *   x-goodspotless-setup-key: <exact TELEGRAM_WEBHOOK_SECRET value>
 * Body: {}
 * Delete this temporary Edge Function after registration has been verified.
 */
const WEBHOOK_URL =
  "https://hrypzfgvjlniuhnglmzm.supabase.co/functions/v1/telegram-webhook";

function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return difference === 0;
}

const result = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return result(405, { ok: false, error: "Method not allowed" });
  }

  const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
  const supplied = request.headers.get("x-goodspotless-setup-key") ?? "";
  if (!secret || !supplied || !equal(supplied, secret)) {
    return result(403, { ok: false, error: "Setup key not accepted" });
  }
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
    return result(500, { ok: false, error: "Invalid webhook secret format" });
  }

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
    return result(500, { ok: false, error: "Telegram bot token missing or malformed" });
  }

  // Fixed destination: the request cannot change the target URL.
  const payload = {
    url: WEBHOOK_URL,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false,
  };

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await response.json() as {
      ok?: boolean;
      description?: string;
    };
    if (!response.ok || !data.ok) {
      return result(502, {
        ok: false,
        error: "Telegram did not accept webhook setup",
        telegram_status: response.status,
        description: data.description ?? "No details",
      });
    }

    const check = await fetch(
      `https://api.telegram.org/bot${token}/getWebhookInfo`,
      { method: "GET" },
    );
    const checkJson = await check.json() as {
      ok?: boolean;
      result?: { url?: string; pending_update_count?: number };
    };
    const verified =
      check.ok && checkJson.ok === true &&
      checkJson.result?.url === WEBHOOK_URL;

    return result(verified ? 200 : 502, {
      ok: verified,
      registered: Boolean(data.ok),
      verified,
      webhook: WEBHOOK_URL,
      pending_updates: checkJson.result?.pending_update_count ?? null,
      next_step: verified
        ? "Delete this temporary function and send /start to your GOODSPOTLESS bot"
        : "Review getWebhookInfo and function logs before testing the bot",
    });
  } catch {
    return result(502, {
      ok: false,
      error: "Could not reach or verify Telegram API",
    });
  }
});
