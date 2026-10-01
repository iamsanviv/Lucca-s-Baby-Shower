-- Esquema para la lista de regalos de Lucca.
-- Ejecutar completo en Supabase → SQL Editor.
-- Los invitados NUNCA leen las tablas directamente: todo pasa por funciones
-- que validan cupos y ocultan los nombres de quién regala qué.

create table if not exists gifts (
  id      int primary key,
  nombre  text not null,
  max_qty int            -- null = ilimitado
);

create table if not exists reservations (
  id         uuid primary key default gen_random_uuid(),
  gift_id    int  not null references gifts(id),
  guest_name text not null,
  token      uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists admin_settings (
  admin_key text not null
);

alter table gifts          enable row level security;
alter table reservations   enable row level security;
alter table admin_settings enable row level security;
-- Sin políticas: el rol anónimo no puede leer ni escribir las tablas.

insert into gifts (id, nombre, max_qty) values
  (1,  'Pañales y pañitos húmedos',   null),
  (2,  'Set de teteros Avent Natural', 1),
  (3,  'Bodys blancos',               null),
  (4,  'Toalla bebé',                 2),
  (5,  'Cobijas bebé',                3),
  (6,  'Pantalones',                  null),
  (7,  'Medias',                      null),
  (8,  'Carro organizador',           1),
  (9,  'Bañera con patas',            1),
  (10, 'Cojín de lactancia',          1),
  (11, 'Fular',                       1),
  (12, 'Sonido blanco',               1),
  (13, 'Nido colecho',                1),
  (14, 'Kit de aseo',                 1),
  (15, 'Baby gym',                    1),
  (16, 'Silla mecedora',              1),
  (17, 'Aspirador nasal',             1),
  (18, 'Monitor y cámara',            1),
  (19, 'Calentador de pañitos',       1),
  (20, 'Esterilizador de biberones',  1)
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

-- Reservar un regalo. Bloquea la fila para evitar que dos personas
-- tomen el último cupo al mismo tiempo.
create or replace function reserve_gift(p_gift_id int, p_name text)
returns table (reservation_id uuid, token uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_max   int;
  v_taken int;
  v_name  text := btrim(coalesce(p_name, ''));
begin
  if char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'NOMBRE_INVALIDO';
  end if;

  select g.max_qty into v_max from gifts g where g.id = p_gift_id for update;
  if not found then
    raise exception 'NO_EXISTE';
  end if;

  if v_max is not null then
    select count(*) into v_taken from reservations r where r.gift_id = p_gift_id;
    if v_taken >= v_max then
      raise exception 'AGOTADO';
    end if;
  end if;

  return query
    insert into reservations (gift_id, guest_name)
    values (p_gift_id, v_name)
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

-- Panel de administración: lista completa con nombres.
create or replace function admin_list(p_key text)
returns table (id uuid, gift_id int, gift_nombre text, guest_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from admin_settings where admin_key = p_key) then
    raise exception 'CLAVE_INCORRECTA';
  end if;
  return query
    select r.id, r.gift_id, g.nombre, r.guest_name, r.created_at
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

revoke all on function gift_status()                   from public;
revoke all on function reserve_gift(int, text)         from public;
revoke all on function cancel_reservation(uuid, uuid)  from public;
revoke all on function admin_list(text)                from public;
revoke all on function admin_release(text, uuid)       from public;
grant execute on function gift_status()                  to anon, authenticated;
grant execute on function reserve_gift(int, text)        to anon, authenticated;
grant execute on function cancel_reservation(uuid, uuid) to anon, authenticated;
grant execute on function admin_list(text)               to anon, authenticated;
grant execute on function admin_release(text, uuid)      to anon, authenticated;
