
create function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table profiles (
 id uuid primary key default gen_random_uuid(), name text not null, network text not null,
 owner text not null default '', jurisdiction text not null default 'NZ' check (jurisdiction in ('NZ','AU')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(name,network));
create table campaigns (
 id uuid primary key default gen_random_uuid(), name text not null unique, owner text not null,
 objective text not null, due_date date not null, status text not null default 'active' check(status in ('active','closed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table posts (
 id uuid primary key default gen_random_uuid(), code text not null unique, profile_id uuid not null references profiles,
 campaign_id uuid references campaigns, title text not null, body text not null, owner text not null default '',
 planned_at timestamptz, published_at timestamptz, permalink text not null default '',
 state text not null default 'draft' check(state in ('draft','review','approved','published','archived')),
 revision integer not null default 1 check(revision>0), advertising boolean not null default false,
 disclosure_evidence text not null default '', claim_evidence text not null default '',
 rights_until date, source_key text unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table approvals (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references posts, revision integer not null,
 decision text not null check(decision in ('approved','rejected')), actor text not null check(length(trim(actor))>0),
 evidence text not null check(length(trim(evidence))>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table metrics (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references posts, as_of date not null,
 impressions bigint check(impressions>=0), engagements bigint check(engagements>=0), clicks bigint check(clicks>=0),
 source text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(post_id,as_of));
create table imports (
 id uuid primary key default gen_random_uuid(), fingerprint text not null unique, filename text not null,
 as_of date not null, actor text not null, row_count integer not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table source_rows (
 id uuid primary key default gen_random_uuid(), import_id uuid not null references imports, post_id uuid not null references posts,
 raw jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table activity (
 id uuid primary key default gen_random_uuid(), post_id uuid references posts, actor text not null,
 action text not null, detail jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create function invalidate_review() returns trigger language plpgsql as $$
begin
 if (new.body,new.title,new.profile_id,new.campaign_id,new.planned_at,new.advertising,new.disclosure_evidence,new.claim_evidence,new.rights_until)
 is distinct from (old.body,old.title,old.profile_id,old.campaign_id,old.planned_at,old.advertising,old.disclosure_evidence,old.claim_evidence,old.rights_until) then
 new.revision=old.revision+1;
 if old.state in ('review','approved') then new.state='draft'; end if;
 end if;
 return new;
end $$;
create trigger post_revision before update on posts for each row execute function invalidate_review();
do $$ declare t text; begin
 foreach t in array array['profiles','campaigns','posts','approvals','metrics','imports','source_rows','activity'] loop
 execute format('create trigger touch before update on %I for each row execute function touch_updated()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
 end loop;
end $$;
create view latest_metrics as select distinct on(post_id) * from metrics order by post_id,as_of desc;
create view post_performance as
 select p.id,p.code,p.title,f.name as profile,f.network,c.name as campaign,p.owner,p.state,p.published_at,
 m.as_of,m.impressions,m.engagements,m.clicks,
 case when m.impressions>0 and m.engagements is not null then round(100.0*m.engagements/m.impressions,2) end as engagement_pct,
 case when m.impressions>0 and m.clicks is not null then round(100.0*m.clicks/m.impressions,2) end as click_pct
 from posts p join profiles f on f.id=p.profile_id left join campaigns c on c.id=p.campaign_id left join latest_metrics m on m.post_id=p.id;
create view approval_queue as select p.id,p.code,p.title,p.owner,p.revision,p.planned_at,
 coalesce(a.decision,'missing') as decision,a.revision as reviewed_revision,a.actor,
 (a.decision='approved' and a.revision=p.revision) as current_approval
 from posts p left join lateral (select * from approvals a where a.post_id=p.id order by a.created_at desc,a.id desc limit 1) a on true
 where p.state not in ('published','archived');
create view attention as
 select p.id,p.code,p.title,p.owner,'overdue plan' as issue from posts p where planned_at<now() and state not in ('published','archived')
 union all select p.id,p.code,p.title,p.owner,'unassigned owner' from posts p where owner='' and state<>'archived'
 union all select p.id,p.code,p.title,p.owner,'stale draft' from posts p where state='draft' and updated_at<now()-interval '7 days'
 union all select p.id,p.code,p.title,p.owner,'metrics missing or stale' from posts p left join latest_metrics m on p.id=m.post_id where state='published' and (m.as_of is null or m.as_of<current_date-7);
create view compliance_findings as
 select p.id,p.code,p.title,f.jurisdiction,'AD-DISCLOSURE' as rule,'advertising identification evidence missing' as issue,
 case when f.jurisdiction='NZ' then 'https://asa.co.nz/wp-content/uploads/2025/01/Quick-Guide-Identification-of-Ads-1.pdf' else 'https://aana.com.au/code-of-ethics/' end as source
 from posts p join profiles f on f.id=p.profile_id where advertising and disclosure_evidence='' and state<>'archived'
 union all select p.id,p.code,p.title,f.jurisdiction,'HOUSE-CLAIMS','advertising claim evidence missing','docs/compliance.md#house-rules'
 from posts p join profiles f on f.id=p.profile_id where advertising and claim_evidence='' and state<>'archived'
 union all select p.id,p.code,p.title,f.jurisdiction,'HOUSE-RIGHTS','asset rights expired or expire before planned use','docs/compliance.md#house-rules'
 from posts p join profiles f on f.id=p.profile_id where rights_until is not null and rights_until<greatest(current_date,coalesce(planned_at::date,current_date)) and state not in ('published','archived');
