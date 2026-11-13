/**
 * London Clean Route only: public enquiry intake for a NEW LCR Supabase project.
 *
 * NOT PRODUCTION-READY UNTIL separate project, Turnstile, rate limiting, privacy
 * notice, secrets, and complete E2E tests have been configured. Do not activate
 * the frontend live adapter before then. No CWX credentials or database.
 *
 * Accepts JSON only; optional photos need a separate, private upload endpoint.
 */
type Incoming = Record<string, unknown>;
type Enquiry = { id: string; reference: string; name: string; phone_e164: string;
  postcode: string; service: string; preferred_date: string; time_window: string;
  notes: string | null; email: string };
const SERVICES = new Set([
  "regular-domestic-cleaning","deep-cleaning","end-of-tenancy-cleaning",
  "short-let-changeovers","office-cleaning","after-builders-cleaning",
]);
const HOME_TYPES = new Set(["flat","house","studio","office","other"]);
const FREQUENCIES = new Set(["once","weekly","fortnightly","monthly","unsure"]);
const WINDOWS = new Set(["morning","afternoon","evening","flexible"]);
const UK_POSTCODE = /^(GIR ?0AA|[A-PR-UWYZ][A-HK-Y]?\d[A-Z\d]? ?\d[ABD-HJLNP-UW-Z]{2})$/i;
const required = (name: string) => {
  const v = Deno.env.get(name);
  if(!v) throw new Error("Missing LCR secret/config: " + name);
  return v;
};
const supabase = () => required("SUPABASE_URL").replace(/\/+$/,"");
const key=()=>required("SUPABASE_SERVICE_ROLE_KEY");
function normalizePostcode(raw: string) {
  const c=raw.replace(/\s+/g,"").toUpperCase();
  return c.length>3?c.slice(0,-3)+" "+c.slice(-3):c;
}
function normalizePhone(raw:string) {
  const s=raw.replace(/[\s().-]/g,"").replace(/^\+440/,"+44");
  if(/^00\d+$/.test(s)) return normalizePhone("+"+s.slice(2));
  if(/^0\d{9,10}$/.test(s)) return "+44"+s.slice(1);
  return /^\+[1-9]\d{6,14}$/.test(s)?s:null;
}
function isoValid(value: string) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const d=new Date(value+"T12:00:00Z");
  const ukToday=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10)===value && value>=ukToday;
}
const text=(v:unknown,max:number)=>typeof v==="string"?v.trim().slice(0,max):"";
const num=(v:unknown)=>typeof v==="number"?v: typeof v==="string"&&v.trim()?Number(v):NaN;
function parsePayload(input: Incoming) {
  const service=text(input.service,64), homeType=text(input.homeType,32), frequency=text(input.frequency,32);
  const timeWindow=text(input.timeWindow,32), postcode=normalizePostcode(text(input.postcode,16));
  const date=text(input.date,16), name=text(input.name,100), email=text(input.email,255);
  const phone=normalizePhone(text(input.phone,50));
  const bedrooms=num(input.bedrooms), bathrooms=num(input.bathrooms);
  const sizeStr=text(input.sizeSqft,8), sizeSqft=sizeStr?Number(sizeStr):null;
  const notes=text(input.notes,1000);
  if(!SERVICES.has(service)||!HOME_TYPES.has(homeType)||!FREQUENCIES.has(frequency)||!WINDOWS.has(timeWindow))return null;
  if(!UK_POSTCODE.test(postcode)||!isoValid(date))return null;
  if(!Number.isInteger(bedrooms)||bedrooms<0||bedrooms>10||!Number.isInteger(bathrooms)||bathrooms<0||bathrooms>10)return null;
  if(sizeSqft!==null&&(!Number.isInteger(sizeSqft)||sizeSqft<0||sizeSqft>999999))return null;
  if(name.length<2||!phone||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return null;
  if(input.privacyAccepted!==true||typeof input.marketingOptIn!=="boolean"||text(input.company,128))return null;
  return { service,home_type:homeType,bedrooms,bathrooms,size_sqft:sizeSqft,
    frequency,postcode,outward_code:postcode.split(" ")[0],preferred_date:date,
    time_window:timeWindow,notes:notes||null,name,phone_e164:phone,email,
    privacy_accepted_at:new Date().toISOString(),marketing_opt_in:input.marketingOptIn,
    locale:input.locale==="pt"?"pt":"en",status:"new"
  };
}
async function rest<T>(path:string,opts:RequestInit={}):Promise<T>{
  const response=await fetch(supabase()+"/rest/v1/"+path,{...opts,headers:{
    apikey:key(),Authorization:"Bearer "+key(),
    ...(opts.body?{"Content-Type":"application/json"}:{}),...(opts.headers||{})
  }});
  if(!response.ok) throw new Error("LCR database request failed: "+response.status);
  if(response.status===204) return undefined as T;
  const body=await response.text();
  return (body?JSON.parse(body):undefined) as T;
}
const corsHeaders = (origin:string|null)=>{
  const allowed=Deno.env.get("PUBLIC_SITE_ORIGIN");
  if(!allowed||!origin||origin!==allowed)return null;
  return {"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST,OPTIONS",
    "Access-Control-Allow-Headers":"content-type","Vary":"Origin"};
};
function reply(status:number, data:Record<string,unknown>,headers:Record<string,string>={}) {
  return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json",...headers}});
}
async function verifyCaptcha(token:string, ip:string):Promise<boolean> {
  if(!token||token.length>3000)return false;
  const secret=required("TURNSTILE_SECRET_KEY");
  const form=new FormData();
  form.set("secret",secret); form.set("response",token);
  if(ip)form.set("remoteip",ip);
  const response=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body:form});
  if(!response.ok)return false;
  const json=await response.json() as {success?:boolean;hostname?:string};
  // Siteverify must genuinely accept the response. If strict hostname validation
  // is needed, add TURNSTILE_EXPECTED_HOSTNAME to configuration.
  const expectedHost=Deno.env.get("TURNSTILE_EXPECTED_HOSTNAME");
  return json.success===true && (!expectedHost||json.hostname===expectedHost);
}
async function sendBot(enquiry:Enquiry):Promise<number>{
  const bot=required("TELEGRAM_BOT_TOKEN");
  const chat=required("TELEGRAM_ADMIN_CHAT_ID");
  const detail = [
    "🧹 NEW LONDON CLEAN ROUTE ENQUIRY",
    "🔖 Ref: "+enquiry.reference,
    "🙋 Name: "+enquiry.name,
    "📞 Phone: "+enquiry.phone_e164,
    "✉️ Email: "+enquiry.email,
    "🧽 Service: "+enquiry.service,
    "📍 Postcode: "+enquiry.postcode,
    "📅 Requested: "+enquiry.preferred_date+" / "+enquiry.time_window,
    enquiry.notes?"📝 Notes: "+enquiry.notes.slice(0,500):""
  ].filter(Boolean).join("\n");
  const keyboard={inline_keyboard:[[
    {text:"✅ Approve",callback_data:"lcr|approve|"+enquiry.id},
    {text:"💬 Ask details",callback_data:"lcr|ask|"+enquiry.id}
  ],[
    {text:"❌ Decline",callback_data:"lcr|decline|"+enquiry.id}
  ]]};
  const response=await fetch("https://api.telegram.org/bot"+bot+"/sendMessage",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      chat_id:chat,text:detail,reply_markup:keyboard
    })
  });
  const data=await response.json() as {ok:boolean;result?:{message_id:number}};
  if(!response.ok||!data.ok||!data.result?.message_id)throw new Error("LCR bot notification failed");
  return data.result.message_id;
}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("Origin");
  const cors=corsHeaders(origin);
  if(!cors)return reply(403,{error:"Origin not permitted"});
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST")return reply(405,{error:"Method not allowed"},cors);
  const size=Number(req.headers.get("Content-Length")||0);
  if(size>12000)return reply(413,{error:"Payload too large"},cors);
  try{
    // The endpoint must not be activated without this secret: fail closed.
    required("TURNSTILE_SECRET_KEY");
    const body=await req.text();
    if(body.length>12000)return reply(413,{error:"Payload too large"},cors);
    const input=JSON.parse(body) as Incoming;
    if(!input||typeof input!=="object"||Array.isArray(input))return reply(400,{error:"Invalid enquiry"},cors);
    const ip=(req.headers.get("CF-Connecting-IP")||req.headers.get("X-Forwarded-For")||"").split(",")[0].trim();
    if(!await verifyCaptcha(text(input.captchaToken,3000),ip))return reply(403,{error:"Verification unsuccessful"},cors);
    const data=parsePayload(input);
    if(!data)return reply(422,{error:"Please check your details"},cors);
    // TODO: implement an atomic per-IP rate limiter and customer consent retention
    // policies in the new Supabase project before switching the public form live.
    const rows=await rest<Enquiry[]>("enquiries?select=*",{
      method:"POST",headers:{"Prefer":"return=representation"},body:JSON.stringify(data)
    });
    const lead=rows[0];
    if(!lead) throw new Error("LCR lead insert returned no record");
    await rest("quote_events",{method:"POST",headers:{"Prefer":"return=minimal"},
      body:JSON.stringify({enquiry_id:lead.id,type:"created",actor:"system",payload:{source:"website"}})});
    try{
      const messageId=await sendBot(lead);
      await rest("enquiries?id=eq."+encodeURIComponent(lead.id),{method:"PATCH",headers:{"Prefer":"return=minimal"},
        body:JSON.stringify({telegram_delivery_status:"sent",telegram_message_id:messageId})});
      await rest("quote_events",{method:"POST",headers:{"Prefer":"return=minimal"},
        body:JSON.stringify({enquiry_id:lead.id,type:"telegram_notified",actor:"system",payload:{message_id:messageId}})});
    }catch{
      await rest("enquiries?id=eq."+encodeURIComponent(lead.id),{method:"PATCH",headers:{"Prefer":"return=minimal"},
        body:JSON.stringify({telegram_delivery_status:"failed"})}).catch(()=>{});
      // The enquiry is still safely stored; do not imply customer must resubmit.
      console.error("LCR Telegram notify failed; lead saved for admin recovery");
    }
    return reply(201,{reference:lead.reference,stored:true,message:"Enquiry received for review"},cors);
  }catch(error){
    console.error("LCR enquiry intake error",error instanceof Error?error.message:"unknown");
    return reply(503,{error:"Service temporarily unavailable"},cors);
  }
});
