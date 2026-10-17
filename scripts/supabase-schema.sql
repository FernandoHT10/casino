-- ============================================================================
-- CASINO ROYAL AC - ESQUEMA DE BASE DE DATOS ONLINE (SUPABASE / POSTGRESQL)
-- ============================================================================
-- Instrucciones:
-- 1. Ve a tu proyecto en https://supabase.com
-- 2. Entra en el menú lateral izquierdo -> "SQL Editor"
-- 3. Pega todo el contenido de este archivo y presiona el botón "Run" (verde)
-- 4. ¡Listo! Tu casino ya tendrá base de datos en la nube 24/7 sin depender de tu PC.
-- ============================================================================

-- 1. Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- 2. Crear tabla de perfiles de usuario vinculada a la autenticación de Supabase
create table if not exists public.profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    username text unique not null,
    saldo bigint not null default 10000 check (saldo >= 0),
    level integer not null default 1 check (level >= 1),
    xp integer not null default 0 check (xp >= 0),
    coins integer not null default 100 check (coins >= 0),
    avatar text not null default 'user',
    last_bonus bigint not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. Habilitar Seguridad a Nivel de Fila (Row Level Security - RLS)
alter table public.profiles enable row level security;

-- 4. Políticas de Seguridad (Cada jugador solo puede leer y modificar sus propios datos)
drop policy if exists "Los usuarios pueden ver su propio perfil" on public.profiles;
create policy "Los usuarios pueden ver su propio perfil" 
on public.profiles for select 
using (auth.uid() = id);

drop policy if exists "Los usuarios pueden actualizar su propio perfil" on public.profiles;
create policy "Los usuarios pueden actualizar su propio perfil" 
on public.profiles for update 
using (auth.uid() = id);

drop policy if exists "Los usuarios pueden insertar su propio perfil" on public.profiles;
create policy "Los usuarios pueden insertar su propio perfil" 
on public.profiles for insert 
with check (auth.uid() = id);

-- 5. Función y Trigger Automático para Nuevos Registros
-- Cada vez que alguien se registra por la web, se le crea su perfil automáticamente con 10,000 créditos
create or replace function public.handle_new_user()
returns trigger as $$
declare
    clean_username text;
begin
    clean_username := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
    
    insert into public.profiles (id, username, saldo, level, xp, coins, avatar, last_bonus)
    values (
        new.id,
        clean_username,
        10000, -- Bono inicial de bienvenida
        1,
        0,
        100,
        'user',
        0
    )
    on conflict (id) do nothing;
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- 6. Habilitar sincronización en tiempo real (opcional para multi-pestaña)
alter publication supabase_realtime add table public.profiles;

-- ============================================================================
-- FIN DEL ESQUEMA
-- ============================================================================
