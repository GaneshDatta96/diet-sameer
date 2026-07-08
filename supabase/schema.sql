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

-- Server-only access via the service role key.
-- Keep Row Level Security on; no public policies needed.
alter table orders enable row level security;
