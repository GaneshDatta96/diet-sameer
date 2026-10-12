<!-- showcase:v1 -->
# Gut Freedom meal plan

A $10 lead-generation tool for a gut-health practice. A short questionnaire becomes a personalised 7-day IBD-calming meal plan, delivered by email 8 to 12 hours later, and every plan ends with an invitation to book a call.

Built by [Ganesh Datta](https://ganeshdatta.me): product, the build and the funnel.

## What it shows

- **The practitioner's method as code.** A rules engine encodes the practice's traffic-light food guide. AI is optional and falls back to the rules on any error.
- **Delivery that feels hand-finished.** Plans are scheduled through the email provider for later delivery, with no cron job.
- **Payments wired to the CRM.** Kajabi checkout and webhooks, with Supabase holding orders between payment and delivery.
- **Easy to review.** It runs with zero external keys: mock payment, offline plan generator and console email.

## Stack

Next.js 16 · React 19 · TypeScript · Supabase · Kajabi · Resend · Tailwind CSS 4 · Vercel

---

## Developer notes

A low-ticket ($10) lead-generation tool for **Sameer Dossani (GutFreedom)**. Users
answer a short, Typeform-style questionnaire and receive a personalized 7-day
IBD-calming meal plan by email — deliberately delivered after an **8–12 hour
"crafting" window** so it feels hand-finished rather than machine-generated.
Every plan is grounded in Sameer's **IBD Traffic-Light Food Guide** and ends by
inviting the user to book a free strategy call.

> Runs with **zero external keys** for review: mock payment, offline plan
> generator, and console "email". Add keys to switch on Stripe, OpenAI and Resend.

### Quick start

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

### The user flow

1. **Landing** (`/`) — value prop, traffic-light explainer, Sameer's voice.
2. **Intake** (`/plan`) — one-question-at-a-time form: name, email, eating style
   (meat eater / semi-vegetarian / vegetarian), meat frequency, food likes &
   dislikes, dietary restrictions, current flare state, goal, and basic body
   info.
3. **Checkout** — $10 (mock or Stripe Checkout).
4. **Confirmation** (`/confirm`) — "your plan is being crafted, arrives in 8–12
   hours" + immediate book-a-call CTA.
5. **Delivery** — Resend sends the plan email at the scheduled time.

### How plans are generated

- **Offline rules engine** (`src/lib/mealPlan.ts`) — deterministic, always
  available, fully faithful to the traffic-light guide. This is the default.
- **Optional AI** (`src/lib/ai.ts`) — if `OPENAI_API_KEY` is set, the model
  writes a warmer plan constrained by the same guide, with automatic fallback to
  the rules engine on any error.

The food guide itself is encoded in `src/lib/foodGuide.ts`.

### Delayed delivery

- On payment, the plan is generated immediately and **scheduled with Resend**
  (`scheduled_at`) for 8–12 hours later.
- **No cron job required** — works on Vercel Hobby.
- **Kajabi** collects payment; **Resend** delivers the personalized plan email.

### Kajabi + Vercel setup

#### What each tool does

| Tool | Role |
|------|------|
| **This app** | Questionnaire, plan generation, confirmation page |
| **Kajabi** | $10 checkout, payment processing, contact CRM, nurture emails |
| **Resend / Gmail SMTP** | Sends the personalized 7-day meal plan |
| **Supabase** | Stores orders between checkout and delivery |

#### 1. Create the offer in Kajabi

- Sales → Pricing → New Offer → $10 one-time offer
- Copy the checkout URL → `KAJABI_OFFER_CHECKOUT_URL`
- Copy the offer ID → `KAJABI_OFFER_ID`

#### 2. Post-purchase redirect

In the offer's **Purchase flow** → Post-purchase → Custom URL:

```
https://YOUR-APP.vercel.app/confirm?orderId={order_id}&kajabi=1
```

If Kajabi doesn't support `{order_id}`, use:

```
https://YOUR-APP.vercel.app/confirm?orderId=ORDER_ID&kajabi=1
```

and set the redirect manually — the webhook matches orders by email as a fallback.

#### 3. Payment webhook

Kajabi → Settings → Integrations → Webhooks → **Payment Succeeded**:

```
https://YOUR-APP.vercel.app/api/kajabi/webhook?secret=YOUR_KAJABI_WEBHOOK_SECRET
```

This triggers plan generation and schedules the Resend email.

#### 4. Optional: API sync

Kajabi → Settings → Public API → create credentials:

- `KAJABI_CLIENT_ID` / `KAJABI_CLIENT_SECRET`
- `KAJABI_SITE_ID` (from API or dashboard)
- `KAJABI_TAG_ID` — tag buyers for email automations (book-a-call sequence, etc.)

#### 5. Environment variables (Vercel)

| Variable | Required |
|----------|----------|
| `KAJABI_OFFER_CHECKOUT_URL` | Yes (for Kajabi checkout) |
| `KAJABI_WEBHOOK_SECRET` | Yes |
| `RESEND_API_KEY` | Yes |
| `RESEND_FROM` | Yes |
| `NEXT_PUBLIC_APP_URL` | Yes |
| `KAJABI_OFFER_ID` | Recommended |
| `KAJABI_CLIENT_ID/SECRET/SITE_ID` | Optional (CRM sync) |
| `STRIPE_SECRET_KEY` | Only if not using Kajabi |

### Deploy to Vercel

1. **Import** the GitHub repo in [Vercel](https://vercel.com) (framework: Next.js).
2. **Create a free Supabase project** at [supabase.com](https://supabase.com) → run `supabase/schema.sql` in the SQL Editor.
3. **Set environment variables** in Project Settings:

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_APP_URL` | Yes | Your production URL, e.g. `https://your-app.vercel.app` |
| `SUPABASE_URL` | Yes | Project URL from Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `service_role` secret (server only — never expose publicly) |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | For test emails | Or use `RESEND_API_KEY` instead |
| `RESEND_API_KEY` | Optional | Production email alternative |
| `OPENAI_API_KEY` | Optional | Omit for rules-based plans |
| `STRIPE_SECRET_KEY` | For real payments | Omit while `SKIP_PAYWALL` is on |

4. **Deploy** — Vercel runs `npm run build` automatically. No extra config needed.

### Configuration

All config is centralized in `src/lib/config.ts` and driven by env vars — see
`.env.example` for the full list.

### Production notes

- Order store: **Supabase** in production, local `.data/` file in dev.
- Stripe payment is verified server-side before any plan is generated.
- `/api/cron/deliver` remains as a manual fallback only (not scheduled).

### Tech

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase · Nodemailer / Resend.
