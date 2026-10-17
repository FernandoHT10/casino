/**
 * Casino Royal AC - Configuración de Supabase (Online Cloud Auth & Database)
 * 
 * Para que el casino funcione 100% online en Vercel (24/7 sin depender de tu PC):
 * 1. Regístrate gratis en https://supabase.com y crea un nuevo proyecto.
 * 2. En tu panel de Supabase ve a: Project Settings -> API
 * 3. Copia el "Project URL" y el "anon public key" y pégalos aquí abajo:
 */

window.CASINO_SUPABASE_CONFIG = {
    // Ejemplo: 'https://xyzabcdefghijklmno.supabase.co'
    url: 'https://TU_PROYECTO.supabase.co',
    
    // Ejemplo: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    anonKey: 'TU_SUPABASE_ANON_KEY'
};
