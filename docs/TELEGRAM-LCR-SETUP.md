# London Clean Route — isolated Telegram bot workflow

**Status: source files prepared; not deployed, connected, or tested live.** This repository belongs only to London Clean Route: \`imprimartdrop-dev/london-clean-route-new-2026\`. No code should connect to the renovation/CWX database, Telegram bot, secrets or customer records. Do not paste secrets into GitHub, ChatGPT or the public website.

## Intended flow

1. Visitor completes the 4-step UK/Portuguese quote form.
2. The public HTTPS Edge Function validates the payload, checks an anti-bot challenge and rate limits, stores enquiry \`LCR-0001\` etc. in **LCR's own Supabase project**. The form must remain in PREVIEW mode until the entire connection has been configured and tested.
3. A distinct bot \`London Clean Route Admin\` sends one private Telegram notification with the reference, selected cleaning service, postcode, name, date, and contact.
4. Telegram inline buttons **✅ Approve** / **💬 Ask for details** / **❌ Decline** update LCR's lead and append audit events. Only the configured Telegram admin account in the configured admin chat can use them.
5. After each action the bot sends a **reviewable WhatsApp draft** containing customer details, emoji and bold formatting, encoded in a direct \`api.whatsapp.com/send\` link. Opening the link **does not send the WhatsApp message**. Manually press Send in WhatsApp.
6. Once actually sent, **✅ Mark as sent** updates the LCR record. Quotation command: \`/quote LCR-0001 250\` (GBP, with a price entered by the admin). A booking may be confirmed using \`/book LCR-0001 YYYY-MM-DD HH:MM\` only after personally agreeing it with the customer. A requested time alone is not a booking.

## Safe setup (separate infrastructure only)

1. Create a **new Supabase project dedicated to LCR**, preferably in UK/London region \`eu-west-2\`. Never run SQL in \`Proj-UK - Serviço OBRAS\` or any prior project.
2. Inside that new project, review and apply \`docs/supabase-schema.sql\`, then \`supabase/migrations/20261113_telegram_bot.sql\` in order. Thoroughly review security/RLS policies and set up the server-side admin allowlist before publishing.
3. Create a **new Telegram bot** using the official BotFather. Keep its token secure. Open a private conversation with the new bot and find your private chat ID and Telegram user ID. Do not reuse CWX credentials.
4. Set Edge Function secrets in the LCR Supabase dashboard:
    - \`SUPABASE_URL\` (from LCR project)
    - \`SUPABASE_SERVICE_ROLE_KEY\` (LCR project, server-side only; never in a \`VITE_\` variable or GitHub)
    - \`TELEGRAM_BOT_TOKEN\` (new LCR bot)
    - \`TELEGRAM_ADMIN_CHAT_ID\` (your private chat ID)
    - \`TELEGRAM_ADMIN_USER_ID\` (your numeric Telegram ID)
    - \`TELEGRAM_WEBHOOK_SECRET\` (unique Telegram-compatible private random secret)
    - \`PUBLIC_SITE_ORIGIN\` (production HTTPS origin to permit CORS)
    - \`TURNSTILE_SECRET_KEY\` (Cloudflare Turnstile server secret before live form submissions)
    - \`RATE_LIMIT_SALT\` (private random secret for request rate limiting, if enabled)
5. Deploy \`supabase/functions/telegram-webhook/index.ts\` as \`telegram-webhook\`; config has \`verify_jwt = false\` because **Telegram does not pass Supabase JWTs**. It authenticates Telegram using \`X-Telegram-Bot-Api-Secret-Token\`, strict admin chat/user checks, and a replay-deduplication table.
6. Deploy \`supabase/functions/submit-cleaning-enquiry/index.ts\` as \`submit-cleaning-enquiry\`. It must reject bot submissions when captcha is missing or misconfigured. Enable the corresponding site key and live frontend adapter only after end-to-end tests.
7. Register Telegram webhook with Telegram's \`setWebhook\` API using HTTPS POST from a secure terminal or private administrator server (never commit token to code/history):
   - URL: \`https://<NEW-LCR-REF>.supabase.co/functions/v1/telegram-webhook\`
   - secret_token: exactly the value of \`TELEGRAM_WEBHOOK_SECRET\`.
   - allowed_updates: \`["message","callback_query"]\`.
8. Test using fictional customer contact details: valid form → stored lead → bot alert → Approve / Ask / Decline → status in Supabase → WhatsApp text preview (open only, no Send) → Mark as sent.
9. Validate webhook replay handling, the bot's rejection of unauthorized Telegram users/groups, private photos, admin-only access, correct consent and UK privacy notice. Do not activate advertising until successful.

## Production limitations still to complete

- The current frontend intentionally uses \`previewAdapter\` in \`src/lib/backend/enquiry-service.ts\`; no real leads or photos are sent.
- The server-side function supplied here is an integration scaffold: it handles JSON enquiry data but **does not yet accept file uploads**. The UI must continue to retain photos locally until a separate private upload path is implemented.
- Advanced distributed/atomic rate limiting, a verified Turnstile configuration, production bot/admin identity, live notification retries and data retention policies need checks before launch. Telegram notification failure does not mean the customer enquiry was lost; review pending records securely.
- Do not promise that a Telegram button itself sends a WhatsApp message. Only a human can send the prepared link draft.
