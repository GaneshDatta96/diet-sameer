-- Run this once in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Free tier is enough.

create table if not exists orders (
  id text primary key,
  created_at bigint not null,
  status text not null check (status in ('pending', 'paid', 'delivered', 'failed')),
  email text not null,
  payload jsonb not null
);

create index if not exists orders_email_pending_idx
  on orders (lower(email), created_at desc)
  where status = 'pending';

create index if not exists orders_due_idx
  on orders (created_at)
  where status = 'paid';

-- Pay-first Kajabi purchases waiting for the Vercel questionnaire.
create table if not exists paid_entitlements (
  id text primary key,
  email text not null,
  created_at bigint not null,
  payment_ref text not null,
  offer_id text,
  used_at bigint,
  used_order_id text
);

create index if not exists paid_entitlements_email_unused_idx
  on paid_entitlements (lower(email), created_at desc)
  where used_at is null;

create unique index if not exists paid_entitlements_payment_ref_uidx
  on paid_entitlements (payment_ref);

-- Server-only access via the service role key.
alter table orders enable row level security;
alter table paid_entitlements enable row level security;
