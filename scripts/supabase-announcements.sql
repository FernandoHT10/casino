-- ============================================================================
-- CASINO ROYAL AC - TABLA DE AVISOS Y COMUNICADOS OFICIALES (SUPABASE)
-- ============================================================================
-- Instrucciones:
-- 1. Ve a tu panel de Supabase: https://supabase.com
-- 2. Entra en "SQL Editor" en el menú lateral izquierdo
-- 3. Pega este código y haz clic en "Run"
-- ============================================================================

create table if not exists public.announcements (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    content text not null,
    author text not null default 'Administración',
    badge text not null default 'Novedad',
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

-- Habilitar Seguridad a Nivel de Fila (RLS)
alter table public.announcements enable row level security;

-- Lectura pública: cualquier jugador puede leer los comunicados activos
drop policy if exists "Lectura pública de avisos" on public.announcements;
create policy "Lectura pública de avisos"
on public.announcements for select
using (is_active = true);

-- Políticas de inserción, actualización y borrado
drop policy if exists "Crear avisos" on public.announcements;
create policy "Crear avisos"
on public.announcements for insert
with check (true);

drop policy if exists "Modificar avisos" on public.announcements;
create policy "Modificar avisos"
on public.announcements for update
using (true);

drop policy if exists "Eliminar avisos" on public.announcements;
create policy "Eliminar avisos"
on public.announcements for delete
using (true);

-- Habilitar sincronización en tiempo real para notificar a los jugadores al instante
alter publication supabase_realtime add table public.announcements;

-- Comunicado inicial de bienvenida
insert into public.announcements (title, content, author, badge)
values (
    'Bienvenido a Casino Royal AC',
    'Te damos la bienvenida a la plataforma oficial. Disfruta de nuestros juegos con probabilidades transparentes, pagos instantáneos y bonos diarios. Si tienes dudas o sugerencias, comunícate con nuestro equipo.',
    'Dirección General',
    'Novedad'
);
