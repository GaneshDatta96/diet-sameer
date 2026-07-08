# Gut Freedom · 7-Day Personalized Meal Plan Tool

A low-ticket ($10) lead-generation tool for **Sameer Dossani (GutFreedom)**. Users
answer a short, Typeform-style questionnaire and receive a personalized 7-day
IBD-calming meal plan by email — deliberately delivered after an **8–12 hour
"crafting" window** so it feels hand-finished rather than machine-generated.
Every plan is grounded in Sameer's **IBD Traffic-Light Food Guide** and ends by
inviting the user to book a free strategy call.

> Runs with **zero external keys** for review: mock payment, offline plan
> generator, and console "email". Add keys to switch on Stripe, OpenAI and Resend.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — works without it
npm run dev
```

Open http://localhost:3000.

To watch delivery happen quickly during review, set a short window in
`.env.local`:

```bash
DELIVERY_MIN_MINUTES=1
DELIVERY_MAX_MINUTES=2
```

The generated plan email is printed to the server console when no
`RESEND_API_KEY` is set.

## The user flow

1. **Landing** (`/`) — value prop, traffic-light explainer, Sameer's voice.
2. **Intake** (`/plan`) — one-question-at-a-time form: name, email, eating style
   (meat eater / semi-vegetarian / vegetarian), meat frequency, food likes &
   dislikes, dietary restrictions, current flare state, goal, and basic body
   info.
3. **Checkout** — $10 (mock or Stripe Checkout).
4. **Confirmation** (`/confirm`) — "your plan is being crafted, arrives in 8–12
   hours" + immediate book-a-call CTA.
5. **Delivery** — the plan is emailed after the randomized delay.

## How plans are generated

- **Offline rules engine** (`src/lib/mealPlan.ts`) — deterministic, always
  available, fully faithful to the traffic-light guide. This is the default.
- **Optional AI** (`src/lib/ai.ts`) — if `OPENAI_API_KEY` is set, the model
  writes a warmer plan constrained by the same guide, with automatic fallback to
  the rules engine on any error.

The food guide itself is encoded in `src/lib/foodGuide.ts`.

## Delayed delivery

- On payment, the plan is generated immediately and stored with a `deliverAt`
  timestamp (now + random 8–12h).
- A best-effort in-process timer handles single-server/local delivery.
- For reliable production delivery, the cron endpoint `/api/cron/deliver` sends
  everything that's due. `vercel.json` schedules it every 15 minutes; protect it
  with the `CRON_SECRET` env var.

## Configuration

All config is centralized in `src/lib/config.ts` and driven by env vars — see
`.env.example` for the full list (pricing, delivery window, Stripe, OpenAI,
Resend, cron secret).

## Production notes

- The order store (`src/lib/store.ts`) uses a local JSON file under `.data/`
  for development. On Cloudflare Workers it uses the `ORDER_STORE` KV binding
  configured in `wrangler.jsonc`. Swap for Postgres/Supabase if you need richer
  querying at scale.
- With Stripe enabled, payment is verified server-side against the Checkout
  Session before any plan is generated or delivered.
- `/api/preview` (sample generation without payment) is disabled in production
  unless `ALLOW_PREVIEW=1`.

## Deploy to Cloudflare Workers

This app uses Next.js API routes, delayed delivery, and persistent order
storage. **Do not deploy with Cloudflare Pages' default Next.js preset** — it
expects static output and will fail or drop server features.

Use the OpenNext Cloudflare adapter instead:

```bash
# 1. Create a KV namespace for orders and paste the id into wrangler.jsonc
npx wrangler kv namespace create ORDER_STORE

# 2. Set production env vars in the Cloudflare dashboard (or wrangler secrets)
#    NEXT_PUBLIC_APP_URL, STRIPE_SECRET_KEY, RESEND_API_KEY, CRON_SECRET, etc.

# 3. Build and deploy
npm run deploy
```

For Git-connected Cloudflare Workers builds, set:

- **Build command:** `npm run build` (auto-detects Cloudflare CI and runs OpenNext)
- **Deploy command:** `npx wrangler deploy`

Or explicitly: `npm run build:cf` then `npx wrangler deploy`.

`build:cf` runs `populateCache` so pre-rendered pages (`/`, `/plan`, `/confirm`) are
copied into the static asset bundle. Skipping that step causes **404 on every page**.

**Do not use Cloudflare Pages** with the default Next.js preset for this app — use
**Cloudflare Workers** with OpenNext instead. Pages (`*.pages.dev`) will 404 because
this app needs server API routes and the OpenNext worker bundle.

Schedule `/api/cron/deliver` every 15 minutes (cron-job.org, GitHub Actions,
or a Cloudflare Cron Trigger hitting the URL with `CRON_SECRET`). The
`vercel.json` cron schedule only applies on Vercel.

Local preview in the Workers runtime:

```bash
cp .dev.vars.example .dev.vars
npm run preview
```

## Tech

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4.
