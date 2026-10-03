-- Esquema para la lista de regalos de Lucca.
-- Ejecutar completo en Supabase → SQL Editor.
-- Los invitados NUNCA leen las tablas directamente: todo pasa por funciones
-- que ocultan los nombres de quién regala qué. Sin cupos: cualquiera puede
-- regalar lo que quiera; la mamá ve todo en el panel.

create table if not exists gifts (
  id      int primary key,
  nombre  text not null,
  max_qty int            -- se conserva por compatibilidad; hoy siempre null (sin cupo)
);

create table if not exists reservations (
  id         uuid primary key default gen_random_uuid(),
  gift_id    int  not null references gifts(id),
  guest_name text not null,
  nota       text,        -- descripción opcional (regalo personalizado)
  token      uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists admin_settings (
  admin_key text not null
);

alter table reservations add column if not exists nota text;

alter table gifts          enable row level security;
alter table reservations   enable row level security;
alter table admin_settings enable row level security;
-- Sin políticas: el rol anónimo no puede leer ni escribir las tablas.

insert into gifts (id, nombre, max_qty) values
  (1,  'Pañales y pañitos húmedos',    null),
  (2,  'Set de teteros Avent Natural', null),
  (3,  'Bodys blancos',                null),
  (4,  'Toalla bebé',                  null),
  (5,  'Cobijas bebé',                 null),
  (6,  'Pantalones',                   null),
  (7,  'Medias',                       null),
  (8,  'Carro organizador',            null),
  (9,  'Bañera con patas',             null),
  (10, 'Cojín de lactancia',           null),
  (11, 'Fular',                        null),
  (12, 'Sonido blanco',                null),
  (13, 'Nido colecho',                 null),
  (14, 'Kit de aseo',                  null),
  (15, 'Baby gym',                     null),
  (16, 'Silla mecedora',               null),
  (17, 'Aspirador nasal',              null),
  (18, 'Monitor y cámara',             null),
  (19, 'Calentador de pañitos',        null),
  (20, 'Esterilizador de biberones',   null),
  (21, 'Regalo personalizado',         null)
on conflict (id) do update set nombre = excluded.nombre, max_qty = excluded.max_qty;

-- Clave del panel de administración (cámbiala por una tuya).
insert into admin_settings (admin_key)
select 'CAMBIA-ESTA-CLAVE' where not exists (select 1 from admin_settings);

-- Estado público: cuántos han elegido cada regalo (sin nombres).
create or replace function gift_status()
returns table (gift_id int, max_qty int, taken int)
language sql stable security definer set search_path = public as $$
  select g.id, g.max_qty, count(r.id)::int
  from gifts g left join reservations r on r.gift_id = g.id
  group by g.id, g.max_qty
  order by g.id;
$$;

-- Reservar un regalo (sin cupos). p_nota es opcional (regalo personalizado).
drop function if exists reserve_gift(int, text);
create or replace function reserve_gift(p_gift_id int, p_name text, p_nota text default null)
returns table (reservation_id uuid, token uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_nota text := nullif(btrim(coalesce(p_nota, '')), '');
begin
  if char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'NOMBRE_INVALIDO';
  end if;
  if v_nota is not null and char_length(v_nota) > 200 then
    v_nota := left(v_nota, 200);
  end if;
  if not exists (select 1 from gifts where id = p_gift_id) then
    raise exception 'NO_EXISTE';
  end if;

  return query
    insert into reservations (gift_id, guest_name, nota)
    values (p_gift_id, v_name, v_nota)
    returning reservations.id, reservations.token;
end;
$$;

-- Cancelar: solo quien tiene el token (guardado en su navegador).
create or replace function cancel_reservation(p_id uuid, p_token uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  delete from reservations where id = p_id and token = p_token;
  return found;
end;
$$;

-- Panel de administración: lista completa con nombres y notas.
drop function if exists admin_list(text);
create or replace function admin_list(p_key text)
returns table (id uuid, gift_id int, gift_nombre text, guest_name text, nota text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from admin_settings where admin_key = p_key) then
    raise exception 'CLAVE_INCORRECTA';
  end if;
  return query
    select r.id, r.gift_id, g.nombre, r.guest_name, r.nota, r.created_at
    from reservations r join gifts g on g.id = r.gift_id
    order by r.gift_id, r.created_at;
end;
$$;

-- Panel de administración: liberar una reserva.
create or replace function admin_release(p_key text, p_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from admin_settings where admin_key = p_key) then
    raise exception 'CLAVE_INCORRECTA';
  end if;
  delete from reservations where id = p_id;
  return found;
end;
$$;

revoke all on function gift_status()                    from public;
revoke all on function reserve_gift(int, text, text)    from public;
revoke all on function cancel_reservation(uuid, uuid)   from public;
revoke all on function admin_list(text)                 from public;
revoke all on function admin_release(text, uuid)        from public;
grant execute on function gift_status()                   to anon, authenticated;
grant execute on function reserve_gift(int, text, text)   to anon, authenticated;
grant execute on function cancel_reservation(uuid, uuid)  to anon, authenticated;
grant execute on function admin_list(text)                to anon, authenticated;
grant execute on function admin_release(text, uuid)       to anon, authenticated;
