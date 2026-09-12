create table if not exists magangjogja_content (
  id int primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table magangjogja_content enable row level security;

create table if not exists magangjogja_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action text not null,
  section text not null,
  description text,
  changes jsonb,
  snapshot jsonb
);

alter table magangjogja_history enable row level security;
