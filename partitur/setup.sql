-- Jalankan di Supabase → SQL Editor → New query → Run.
-- Aman dijalankan ulang (tidak menghapus data lagu).

create table if not exists public.lagu (
  id uuid primary key default gen_random_uuid(),
  judul text not null check (char_length(judul) > 0),
  pencipta text default '',
  kategori text default 'Umum',
  pdf_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Kolom pemilik (owner): hanya owner yang boleh menambah / mencabut admin
alter table public.admins add column if not exists is_owner boolean not null default false;

alter table public.lagu enable row level security;
alter table public.admins enable row level security;

-- Fungsi pengecek admin (melewati RLS agar tidak rekursif)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid() and is_owner);
$$;

-- Policy tabel lagu
drop policy if exists "lagu_read" on public.lagu;
drop policy if exists "lagu_insert" on public.lagu;
drop policy if exists "lagu_update" on public.lagu;
drop policy if exists "lagu_delete" on public.lagu;
create policy "lagu_read" on public.lagu for select using (true);
create policy "lagu_insert" on public.lagu for insert to authenticated with check (public.is_admin());
create policy "lagu_update" on public.lagu for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "lagu_delete" on public.lagu for delete to authenticated using (public.is_admin());

drop policy if exists "admins_self" on public.admins;
create policy "admins_self" on public.admins for select to authenticated using (user_id = auth.uid());

-- Kelola admin dari panel admin (daftar boleh dilihat semua admin; tambah/cabut hanya OWNER)
drop function if exists public.list_admins();
create or replace function public.list_admins()
returns table (user_id uuid, email text, created_at timestamptz, is_owner boolean)
language sql security definer set search_path = public, auth as $$
  select a.user_id, u.email::text, u.created_at, a.is_owner
  from public.admins a join auth.users u on u.id = a.user_id
  where public.is_admin() order by a.is_owner desc, u.created_at;
$$;

create or replace function public.add_admin_by_email(p_email text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  if not public.is_owner() then raise exception 'Hanya owner yang boleh menambah admin'; end if;
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then raise exception 'Akun dengan email itu tidak ditemukan'; end if;
  insert into public.admins (user_id) values (uid) on conflict do nothing;
end $$;

create or replace function public.remove_admin(p_user_id uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_owner() then raise exception 'Hanya owner yang boleh mencabut admin'; end if;
  if p_user_id = auth.uid() then raise exception 'Tidak bisa mencabut akses diri sendiri'; end if;
  if exists (select 1 from public.admins where user_id = p_user_id and is_owner) then raise exception 'Owner tidak bisa dicabut'; end if;
  delete from public.admins where user_id = p_user_id;
end $$;

revoke all on function public.is_admin(), public.is_owner(), public.list_admins(), public.add_admin_by_email(text), public.remove_admin(uuid) from public, anon;
grant execute on function public.is_admin(), public.is_owner(), public.list_admins(), public.add_admin_by_email(text), public.remove_admin(uuid) to authenticated;

-- OWNER: kaelbatubara@gmail.com (akunnya harus sudah dibuat di Authentication → Users)
insert into public.admins (user_id)
  select id from auth.users where lower(email) = 'kaelbatubara@gmail.com'
  on conflict do nothing;
update public.admins set is_owner = (user_id = (select id from auth.users where lower(email) = 'kaelbatubara@gmail.com'))
  where exists (select 1 from auth.users where lower(email) = 'kaelbatubara@gmail.com');

-- Cadangan: jika akun di atas belum ada dan belum ada owner sama sekali, admin paling awal jadi owner (supaya tidak terkunci).
update public.admins set is_owner = true
where user_id = (select a.user_id from public.admins a join auth.users u on u.id = a.user_id order by u.created_at limit 1)
  and not exists (select 1 from public.admins where is_owner);

-- Aktifkan real-time agar notifikasi lagu baru bekerja
do $$ begin
  alter publication supabase_realtime add table public.lagu;
exception when duplicate_object then null;
end $$;

-- ADMIN PERTAMA (jalankan sekali, ganti emailnya, setelah akun dibuat di Authentication → Users):
-- insert into public.admins (user_id) select id from auth.users where email = 'emailmu@gmail.com';

-- MENETAPKAN / MEMINDAHKAN OWNER (ganti email; jalankan di SQL Editor):
-- update public.admins set is_owner = false;
-- update public.admins set is_owner = true where user_id = (select id from auth.users where email = 'kaelbatubara@gmail.com');
