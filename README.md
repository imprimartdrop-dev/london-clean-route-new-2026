# London Clean Route - New 2026

Create a COMPLETELY NEW standalone project named "London Clean Route — New 2026", an elegant British domestic and commercial cleaning services lead-generation website. It must not import, remix, connect, reference, read, edit or reuse ANY existing Lovable project, GitHub repository, Supabase project, Telegram bot, WhatsApp account, customer dataset, custom domain, shared secrets or live API credentials. Existing projects including "London Cleaning Services" and "CWX Property Solutions" must remain untouched. Do not deploy or publish anything without explicit request.

GOAL: genuine local client acquisition from Google Search Ads, efficient quote collection and future cleaning appointment route planning. Initial geographical copy: London, UK (especially North West London), expandable later. Target audience: residents, landlords, letting agents, short-let hosts and small offices. English (UK) is the default; Portuguese (Brazil) via a subtle BR/UK language toggle, with complete translation of UI and forms.

PREMIUM VISUAL: boutique British housekeeping brand, polished editorial typography, warm ivory background, sophisticated charcoal and subtle forest/sage green, restrained luxury, generous whitespace, immaculate alignment, mobile-first, high contrast, accessible forms, real-looking candid professional photography relevant to UK flats/houses, no obvious AI illustrations, no gimmicks, no invented external ratings, testimonials or certifications. Business name and logo text "London Clean Route" provisional, editable.

PAGES / SECTIONS: Home premium hero with a clear 'Get a free cleaning quote' CTA, service chips, services detail pages for Regular Domestic Cleaning, One-Off Deep Cleaning, End of Tenancy Cleaning, Airbnb/Short Let Changeovers, Office Cleaning and After Builders Cleaning; How it Works; Areas We Cover (initial NW London but ask for postcode to check availability); FAQs; Contact; Privacy Policy / cookie consent; clear call to action in header and footer. SEO-ready unique UK English metadata, semantic headings, local search landing-page structure for Google Ads, fast loading and accessible UI.

QUOTE FLOW: a polished 4-step form to capture cleaning type, home type, rooms/bathrooms or approximate property size, frequency, postcode, preferred date/time window, optional cleaning specifics / photos, name, phone incl +44 and international phone formats, email, marketing optional opt-in distinct from required privacy acknowledgement. Review/submit screen with generated enquiry reference "LCR-0001" style. Do not pretend backend is connected; while database isn't configured, clearly label any demo form submissions as preview/test and NEVER display a success claim for real submissions. Don't send user info to existing integrations. Design robust input validation, consent, safe errors and pending/loading states, and abuse prevention hook points.

FUTURE PRIVATE ADMIN (UI prototype only): /admin login screen, leads table with new/in-review/quoted/booked/completed/declined statuses, postcode, service, date, lead detail, approve/decline actions, quote price in GBP, manual WhatsApp message preview, calendar week view and grouped cleaning routes by area/postcode (suggested clusters, no misleading travel times). Do not create hardcoded admin credentials or public admin access.

INTEGRATION-READY CONTRACT, but DO NOT integrate anything or share credentials yet: create modular data schema and TypeScript service abstraction for a brand-new separate Supabase project (enquiries, enquiry_photos, quote_events, availability, jobs, service_areas; with row level security), and future Telegram bot notifications to independent admin group, approving/asking/declining from Telegram or admin panel, and manually opening WhatsApp with a prefilled message after review. Always route through secure server-side functions; never expose bot tokens, WhatsApp private details or Supabase service role key client-side. Never add or reuse an existing bot, GitHub repository or database. If a backend is required for truthful submission, leave quote form in preview mode with an explicit 'integration pending' notice until independently configured.

First build a working premium frontend with coherent routes and interaction and leave an integration checklist in project README or context. Keep overall code structured for future GitHub sync and separate external hosting. Never touch any other project.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/97c7ba2e-a152-4ebb-8ec5-b150f4e1bdf0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
