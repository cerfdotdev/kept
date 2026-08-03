create table if not exists rate_limit (
  id text primary key default gen_random_uuid(),
  key text not null unique,
  count integer not null default 1,
  last_request bigint not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
create index if not exists rate_limit_key_idx on rate_limit(key);
