// London Clean Route Telegram webhook — NEW, independent bot only.
// Requires LCR-specific Supabase secrets and admin chat/user IDs.
// No CWX URLs, tokens, project IDs or data are accepted.
type Enquiry = {
  id: string; reference: string; status: string; name: string; phone_e164: string;
  email: string; postcode: string; service: string; preferred_date: string;
  time_window: string; notes?: string|null; quote_price_pence?: number|null;
  confirmed_date?: string|null; confirmed_time?: string|null; whatsapp_sent_at?: string|null;
};
type TelegramUpdate = {
  update_id?: number;
  message?: { message_id: number; from?: { id: number }; chat: { id: number }; text?: string };
  callback_query?: { id: string; from: { id: number }; data?: string; message?: { chat: { id: number }; message_id: number } };
};
const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error("Missing LCR setting: " + name);
  return value;
};
const supabase = () => required("SUPABASE_URL").replace(/\/+$/, "");
const dbKey = () => required("SUPABASE_SERVICE_ROLE_KEY");
const botToken = () => required("TELEGRAM_BOT_TOKEN");
const adminChat = () => required("TELEGRAM_ADMIN_CHAT_ID");
const adminUser = () => required("TELEGRAM_ADMIN_USER_ID");

const equal = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i=0; i<a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

async function rest<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const response = await fetch(supabase() + "/rest/v1/" + path, {
    ...opts,
    headers: {
      apikey: dbKey(), Authorization: "Bearer " + dbKey(),
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!response.ok) throw new Error("LCR REST " + response.status);
  if (response.status === 204) return undefined as T;
  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
}
async function telegramCall(method: string, payload: Record<string, unknown>): Promise<any> {
  const res = await fetch("https://api.telegram.org/bot" + botToken() + "/" + method, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
  });
  const result = await res.json();
  if (!res.ok || !result.ok) throw new Error("Telegram rejected " + method);
  return result.result;
}
const notify = async (text: string, keyboard?: { text: string; callback_data: string }[][]) =>
  telegramCall("sendMessage", { chat_id: adminChat(), text, disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}) });
const acknowledgement = async (id: string, text: string) =>
  telegramCall("answerCallbackQuery", { callback_query_id: id, text: text.slice(0, 170), show_alert: false });

function cleanText(v: unknown, max = 300) {
  return String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0,max);
}
function whatsappText(lead: Enquiry, intent: string) {
  const intro = [
    "Hello " + cleanText(lead.name,100) + ",",
    "",
    "Thank you for contacting *London Clean Route*.",
    "🧹 *Cleaning:* " + cleanText(lead.service,120),
    "📍 *Area:* " + cleanText(lead.postcode,12),
    "🔖 *Reference:* " + cleanText(lead.reference,20),
  ];
  const close = ["", "Kind regards,", "*London Clean Route*"];
  if (intent==="ask") return ["*A FEW MORE DETAILS 💬*", "", ...intro, "",
    "Could you please tell us more about the cleaning required, any priority rooms and access arrangements? That will help us prepare an accurate quote.", ...close].join("\n");
  if (intent==="decline") return ["*UPDATE ON YOUR REQUEST*", "", ...intro, "",
    "Unfortunately, we cannot take on this cleaning request at the moment. Thank you for considering us.", ...close].join("\n");
  if (intent==="quoted" && lead.quote_price_pence != null) return ["*YOUR CLEANING QUOTE 💷*", "", ...intro, "",
    "💷 *Proposed price:* £" + (lead.quote_price_pence/100).toFixed(2), "",
    "The quote is subject to the agreed scope and date availability. Nothing is booked until confirmed by you.", ...close].join("\n");
  if (intent==="booked" && lead.confirmed_date && lead.confirmed_time) return ["*BOOKING CONFIRMED ✅*", "", ...intro, "",
    "📅 *Confirmed date:* " + lead.confirmed_date,
    "⏰ *Confirmed time (UK):* " + lead.confirmed_time,
    "Please tell us promptly about any changes to your arrangements.", ...close].join("\n");
  return ["*CLEANING ENQUIRY REVIEWED ✅*", "", ...intro, "",
    "We have reviewed your enquiry and will follow up shortly with availability and a tailored quotation. No appointment is confirmed yet.", ...close].join("\n");
}
function phoneLink(lead: Enquiry, intent: string) {
  const phone=lead.phone_e164.replace(/[^\d]/g,"");
  if (!/^[1-9]\d{6,14}$/.test(phone)) return null;
  return "https://api.whatsapp.com/send?phone=" + phone + "&text=" + encodeURIComponent(whatsappText(lead,intent));
}
async function findById(id: string): Promise<Enquiry|null> {
  const rows = await rest<Enquiry[]>("enquiries?select=*&id=eq." + encodeURIComponent(id) + "&limit=1");
  return rows[0]||null;
}
async function findByReference(reference: string): Promise<Enquiry|null> {
  const rows = await rest<Enquiry[]>("enquiries?select=*&reference=eq." + encodeURIComponent(reference) + "&limit=1");
  return rows[0]||null;
}
async function updateLead(id: string, fields: Record<string,unknown>, eventType: string, action: string): Promise<Enquiry> {
  const rows = await rest<Enquiry[]>("enquiries?id=eq." + encodeURIComponent(id) + "&select=*", {
    method: "PATCH", headers: {Prefer:"return=representation"}, body: JSON.stringify({...fields,updated_at:new Date().toISOString()})
  });
  if (!rows.length) throw new Error("Lead not found for action");
  await rest("quote_events", { method: "POST", headers: {Prefer: "return=minimal"},
    body: JSON.stringify({enquiry_id:id,type:eventType,actor:"telegram",payload:{action}}) });
  return rows[0];
}
async function shareWhatsAppDraft(lead: Enquiry, intent: string) {
  const link=phoneLink(lead,intent);
  if(!link) { await notify("⚠️ The customer's phone needs manual verification. No WhatsApp link was created."); return; }
  await notify("💬 WhatsApp draft is ready for " + lead.reference +
    ".\n\nOpen the link, CHECK the phone and message, then tap SEND inside WhatsApp.\n" + link +
    "\n\nAfter you actually send it, mark the customer as contacted below.", [
      [{text:"✅ Mark as sent",callback_data:"lcr|sent|"+lead.id}]
    ]);
}
async function handleCallback(data: string, callbackId: string) {
  const parsed = /^lcr\|(approve|ask|decline|sent)\|([0-9a-f-]{36})$/i.exec(data);
  if (!parsed) return acknowledgement(callbackId,"Unrecognised action");
  const [,action,id] = parsed;
  const lead = await findById(id);
  if(!lead) return acknowledgement(callbackId,"This enquiry is no longer available");
  if (action==="sent") {
    if (lead.whatsapp_sent_at) return acknowledgement(callbackId,"Already marked as sent");
    await updateLead(id,{whatsapp_sent_at:new Date().toISOString()},"whatsapp_marked_sent",action);
    await acknowledgement(callbackId,"Marked as sent");
    await notify("✅ WhatsApp marked as manually sent for " + lead.reference + ".");
    return;
  }
  const status= action==="approve"?"in_review":action==="ask"?"information_requested":"declined";
  const updated=await updateLead(id,{status},"telegram_action",action);
  await acknowledgement(callbackId,action==="approve"?"Enquiry accepted for review":action==="ask"?"Further details requested":"Enquiry declined");
  await notify("🔔 " + lead.reference + " → " + status.replaceAll("_"," ") + ". Draft prepared; this does NOT send WhatsApp.");
  await shareWhatsAppDraft(updated,action);
}
async function handleMessage(message: string) {
  const trimmed=message.trim();
  if (/^\/start(?:@\w+)?$/i.test(trimmed)){
    await notify("🧹 London Clean Route admin bot is ready.\nCommands:\n/quote LCR-0001 250\n/book LCR-0001 2026-12-01 10:30\n\nButtons on new enquiries: Approve / Ask / Decline.\nWhatsApp messages are MANUAL.");
    return;
  }
  const quote=/^\/quote(?:@\w+)?\s+(LCR-\d{4,})\s+(\d+(?:\.\d{1,2})?)$/i.exec(trimmed);
  if(quote){
    const ref=quote[1].toUpperCase();const amount=Number(quote[2]);
    if(!Number.isFinite(amount)||amount<=0||amount>100000){await notify("Invalid amount.");return;}
    const lead=await findByReference(ref);
    if(!lead){await notify("Unknown LCR enquiry.");return;}
    const updated=await updateLead(lead.id,{status:"quoted",quote_price_pence:Math.round(amount*100)},"quote_set","quote");
    await notify("💷 Proposed quote saved for " + ref + ": £" + amount.toFixed(2));
    await shareWhatsAppDraft(updated,"quoted");return;
  }
  const booking=/^\/book(?:@\w+)?\s+(LCR-\d{4,})\s+(\d{4}-\d{2}-\d{2})\s+([01]\d|2[0-3]):([0-5]\d)$/i.exec(trimmed);
  if(booking){
    const [,refRaw,date,hh,mm]=booking;
    const ref=refRaw.toUpperCase();
    const parsed=new Date(date+"T12:00:00Z");
    const currentUK=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||date<currentUK){await notify("Invalid/past UK booking date.");return;}
    const lead=await findByReference(ref);
    if(!lead){await notify("Unknown LCR enquiry.");return;}
    const updated=await updateLead(lead.id,{status:"booked",confirmed_date:date,confirmed_time:hh+":"+mm},"booking_confirmed","book");
    await notify("📅 Booking marked confirmed for " + ref + ", " + date+" "+hh+":"+mm+" UK. Only use this after the customer agreed.");
    await shareWhatsAppDraft(updated,"booked");return;
  }
  await notify("Unknown admin command. Try /quote LCR-0001 250 or /book LCR-0001 YYYY-MM-DD HH:MM.");
}
Deno.serve(async (req: Request) => {
  if(req.method!=="POST") return new Response("Method not allowed",{status:405});
  const expected=required("TELEGRAM_WEBHOOK_SECRET");
  const received=req.headers.get("X-Telegram-Bot-Api-Secret-Token")||"";
  if(!equal(received,expected))return new Response("Forbidden",{status:403});
  try {
    const update=(await req.json()) as TelegramUpdate;
    if(!Number.isSafeInteger(update.update_id)) return new Response("Bad update",{status:400});
    const chat=update.callback_query?.message?.chat.id ?? update.message?.chat.id;
    const user=update.callback_query?.from.id ?? update.message?.from?.id;
    if(String(chat)!==adminChat()||String(user)!==adminUser()) return new Response("OK");
    try {
      await rest("telegram_processed_updates",{method:"POST",headers:{Prefer:"return=minimal"},
        body:JSON.stringify({update_id:update.update_id})});
    } catch(e) {
      if(String(e).includes("409"))return new Response("OK"); // already processed
      throw e;
    }
    try {
      if(update.callback_query) await handleCallback(update.callback_query.data||"",update.callback_query.id);
      else if(update.message?.text) await handleMessage(update.message.text);
    } catch(error) {
      // Remove the processed marker so Telegram may retry an unsuccessful delivery.
      await rest("telegram_processed_updates?update_id=eq."+update.update_id,{method:"DELETE"}).catch(()=>{});
      throw error;
    }
    return new Response("OK");
  } catch(error) {
    console.error("LCR telegram webhook failed:",error instanceof Error?error.message:"unknown");
    return new Response("Webhook temporarily unavailable",{status:503});
  }
});
