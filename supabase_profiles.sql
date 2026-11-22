-- Bản phác thảo cho project DA2. Chạy phần kiểm tra trước khi áp dụng.
-- Nếu đã có trigger ghi vào public.profiles, kiểm tra và hợp nhất với trigger bên dưới.
select t.tgname as trigger_name, pg_get_triggerdef(t.oid) as definition,
       pg_get_functiondef(t.tgfoid) as function_definition
from pg_trigger as t
where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;

-- Chạy khối bên dưới sau khi đã kiểm tra trigger hiện có.
begin;

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text,
    full_name text,
    avatar_url text,
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
grant select (id, email, full_name, avatar_url, created_at)
    on public.profiles to authenticated;

drop policy if exists da2_profile_read_own on public.profiles;
create policy da2_profile_read_own on public.profiles
    for select to authenticated
    using ((select auth.uid()) = id);

-- Giới hạn cả các policy SELECT rộng hơn đã có trên bảng.
drop policy if exists da2_profile_read_limit on public.profiles;
create policy da2_profile_read_limit on public.profiles as restrictive
    for select to public
    using ((select auth.uid()) = id);

create or replace function public.da2_create_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, email, full_name)
    values (new.id, new.email, nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''))
    on conflict (id) do nothing;
    return new;
end;
$$;

revoke execute on function public.da2_create_profile() from public, anon, authenticated;

drop trigger if exists da2_create_profile_after_signup on auth.users;
create trigger da2_create_profile_after_signup
    after insert on auth.users
    for each row execute function public.da2_create_profile();

-- Bổ sung hồ sơ còn thiếu nếu giữ lại tài khoản hiện có.
insert into public.profiles (id, email, full_name)
select id, email, nullif(btrim(raw_user_meta_data ->> 'full_name'), '')
from auth.users
on conflict (id) do nothing;

commit;
