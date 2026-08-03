-- 0001_init.sql — Kept schema + RLS

create extension if not exists pgcrypto;

create type plan as enum ('essential','growth','pro');
create type org_role as enum ('owner','admin','bookkeeper_readonly');
create type tx_status as enum ('auto','pending_review','approved','reclassified');
create type risk_tier as enum ('t1','t2','t3','t4');
create type close_status as enum ('open','in_review','done','amended');
create type doc_status as enum ('uploaded','processing','processed','error');
create type review_verdict as enum ('approve','reclassify','uncertain');
create type subscription_status as enum ('trialing','active','past_due','canceled','incomplete');

create table if not exists "user" (
  id text primary key,
  name text not null,
  email text not null unique,
  email_verified boolean not null default false,
  image text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists "session" (
  id text primary key,
  token text not null unique,
  user_id text not null references "user"(id) on delete cascade,
  expires_at timestamp not null,
  ip_address text,
  user_agent text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists "account" (
  id text primary key,
  account_id text not null,
  provider_id text not null,
  user_id text not null references "user"(id) on delete cascade,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamp,
  refresh_token_expires_at timestamp,
  scope text,
  password text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index if not exists account_user_idx on "account"(user_id);

create table if not exists "verification" (
  id text primary key,
  identifier text not null,
  value text not null,
  expires_at timestamp not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists orgs (
  id text primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan plan not null default 'essential',
  onboarded_at timestamp,
  settings jsonb not null default '{}',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index if not exists orgs_slug_idx on orgs(slug);

create table if not exists memberships (
  id text primary key default gen_random_uuid(),
  org_id text not null references orgs(id) on delete cascade,
  user_id text not null references "user"(id) on delete cascade,
  role org_role not null default 'owner',
  created_at timestamp not null default now(),
  unique (org_id, user_id)
);

create table if not exists bank_accounts (
  id text primary key default gen_random_uuid(),
  org_id text not null references orgs(id) on delete cascade,
  name text not null,
  type varchar(32) not null default 'checking',
  provider varchar(32) not null default 'demo',
  external_id text,
  currency varchar(3) not null default 'USD',
  status varchar(32) not null default 'active',
  created_at timestamp not null default now()
);
create index if not exists bank_accounts_org_idx on bank_accounts(org_id);

create table if not exists merchants (
  id bigserial primary key,
  org_id text references orgs(id) on delete cascade,
  normalized_name text not null,
  display_name text not null,
  category text not null,
  pattern text,
  created_at timestamp not null default now()
);
create index if not exists merchants_name_idx on merchants(normalized_name);
create index if not exists merchants_org_idx on merchants(org_id);

create table if not exists transactions (
  id text primary key default gen_random_uuid(),
  org_id text not null references orgs(id) on delete cascade,
  account_id text not null references bank_accounts(id) on delete cascade,
  external_id text,
  date date not null,
  amount numeric(19,4) not null,
  description text not null,
  memo text,
  category text not null default 'uncategorized',
  confidence numeric(5,4) not null default 0,
  risk_tier risk_tier not null default 't1',
  status tx_status not null default 'pending_review',
  rule_ref text,
  matched_merchant_id bigint,
  created_at timestamp not null default now(),
  unique (org_id, account_id, external_id)
);
create index if not exists transactions_org_date_idx on transactions(org_id, date);
create index if not exists transactions_org_status_idx on transactions(org_id, status);

create table if not exists review_tasks (
  id text primary key default gen_random_uuid(),
  org_id text not null references orgs(id) on delete cascade,
  transaction_id text not null references transactions(id) on delete cascade,
  reviewer_id text references "user"(id),
  status varchar(32) not null default 'queued',
  leased_until timestamp,
  verdict review_verdict,
  reclassified_category text,
  notes text,
  created_at timestamp not null default now(),
  completed_at timestamp,
  unique (transaction_id)
);
create index if not exists review_tasks_org_status_idx on review_tasks(org_id, status);

create table if not exists closes (
  id text primary key default gen_random_uuid(),
  org_id text not null references orgs(id) on delete cascade,
  period varchar(7) not null,
  due_date date not null,
  status close_status not null default 'open',
  signed_off_by text references "user"(id),
  signed_off_at timestamp,
  sla_met boolean,
  credit_issued boolean not null default false,
  client_ack varchar(16),
  client_ack_at timestamp,
  notes text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  unique (org_id, period)
);
create index if not exists closes_org_status_idx on closes(org_id, status);

create table if not exists documents (
  id text primary key default gen_random_uuid(),
  org_id text not null references orgs(id) on delete cascade,
  kind varchar(32) not null default 'receipt',
  storage_key text,
  filename text not null,
  mime text not null,
  size integer not null default 0,
  status doc_status not null default 'uploaded',
  uploaded_by text references "user"(id),
  metadata jsonb not null default '{}',
  created_at timestamp not null default now()
);
create index if not exists documents_org_idx on documents(org_id);

create table if not exists subscriptions (
  id text primary key default gen_random_uuid(),
  org_id text not null references orgs(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan plan not null default 'essential',
  status subscription_status not null default 'active',
  current_period_end timestamp,
  demo boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists referral_partners (
  id text primary key default gen_random_uuid(),
  org_id text not null references orgs(id) on delete cascade,
  partner_id text references "user"(id),
  partner_name text,
  revenue_share_pct integer not null default 20,
  status varchar(32) not null default 'active',
  created_at timestamp not null default now()
);
create index if not exists referral_partners_org_idx on referral_partners(org_id);

create table if not exists audit_log (
  id text primary key default gen_random_uuid(),
  org_id text,
  actor_id text,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamp not null default now()
);
create index if not exists audit_log_org_idx on audit_log(org_id);
create index if not exists audit_log_created_idx on audit_log(created_at);

create table if not exists demo_otps (
  id text primary key default gen_random_uuid(),
  email text not null,
  code text not null,
  created_at timestamp not null default now(),
  consumed boolean not null default false
);
create index if not exists demo_otps_email_idx on demo_otps(email);

-- ---------- RLS ----------
alter table transactions enable row level security;
alter table closes enable row level security;
alter table documents enable row level security;
alter table review_tasks enable row level security;
alter table bank_accounts enable row level security;

create or replace function kept_current_org() returns text as $$
  select nullif(current_setting('app.org_id', true), '')
$$ language sql stable;

drop policy if exists tx_org_policy on transactions;
create policy tx_org_policy on transactions
  using (org_id::text = kept_current_org())
  with check (org_id::text = kept_current_org());

drop policy if exists close_org_policy on closes;
create policy close_org_policy on closes
  using (org_id::text = kept_current_org())
  with check (org_id::text = kept_current_org());

drop policy if exists doc_org_policy on documents;
create policy doc_org_policy on documents
  using (org_id::text = kept_current_org())
  with check (org_id::text = kept_current_org());

drop policy if exists review_org_policy on review_tasks;
create policy review_org_policy on review_tasks
  using (org_id::text = kept_current_org())
  with check (org_id::text = kept_current_org());

drop policy if exists bank_org_policy on bank_accounts;
create policy bank_org_policy on bank_accounts
  using (org_id::text = kept_current_org())
  with check (org_id::text = kept_current_org());
