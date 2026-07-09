-- SB Home Buyers — seller lead intake
-- Dual-exit model: every lead can resolve down the cash track, the list
-- track, both offers presented, or dead. See CLAUDE.md §1.

set check_function_bodies = off;

create table public.leads (
  id uuid primary key default gen_random_uuid(),

  -- Contact
  name text not null,
  phone text not null,
  email text,

  -- Property
  address text not null,
  condition text not null default 'not-sure'
    check (condition in ('move-in-ready','needs-some-work','major-repairs','not-sure')),
  timeline text not null default 'exploring'
    check (timeline in ('asap','30-days','90-days','exploring')),
  notes text,

  -- Dual-exit pipeline (CLAUDE.md §1): tag every lead by which exit(s) are
  -- live. Starts 'unqualified'; both offers get presented, then the seller's
  -- pick moves it to cash/list.
  track text not null default 'unqualified'
    check (track in ('unqualified','cash','list','both-presented','dead')),
  status text not null default 'new'
    check (status in ('new','contacted','walkthrough-scheduled','offers-presented','under-contract','closed','lost')),

  -- Underwriting scratchpad (70% rule inputs/outputs, filled in by the team)
  arv numeric,
  rehab_estimate numeric,
  max_allowable_offer numeric,
  as_is_value numeric,
  mortgage_payoff numeric,

  -- Attribution
  source text not null default 'website',
  utm jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_status_idx on public.leads(status);
create index leads_track_idx on public.leads(track);
create index leads_created_at_idx on public.leads(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- RLS: no public access. The website writes via the service-role key from
-- the server only; the team reads via the Supabase dashboard (or a future
-- authenticated admin UI).
alter table public.leads enable row level security;
