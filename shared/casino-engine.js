/**
 * Casino Royal AC - Shared Engine (v4.0 - Supabase Cloud Auth & Multi-Tab Synchronization)
 * Integración nativa con Supabase (PostgreSQL 24/7 en la nube),
 * Transacciones atómicas por Ronda (startRound, addExtraBet, settleRound),
 * Idempotencia estricta anti-duplicación, CSPRNG (Web Crypto API) y Web Audio API.
 */

class CasinoEngine {
    constructor() {
        this.supabase = null;
        this.supabaseConfigured = false;
        this.user = null;
        this.soundMuted = localStorage.getItem('casino_sound_muted') === 'true';
        this.audioCtx = null;
        this.assetBase = window.location.pathname.includes('/games/') ? '../assets/' : 'assets/';

        // Registro de Rondas Transaccionales en Memoria (Anti-Duplicación)
        this.activeRounds = new Map();
        this.settledRounds = new Set();
        this.cloudSyncTimeout = null;

        // 1. Eliminar automáticamente perfiles obsoletos / inflados de versiones anteriores
        this.wipeLegacyProfiles();

        // 2. Sincronizar estado local en memoria
        this.syncFromStorage();
        this.setupStorageListener();

        // 3. Inicializar Supabase Cloud
        this.initSupabase();
    }

    /* -------------------------------------------------------------
       1. LIMPIEZA DE PERFILES OBSOLETOS (Migración a Supabase Cloud)
    ---------------------------------------------------------------- */
    wipeLegacyProfiles() {
        if (!localStorage.getItem('casino_wipe_cloud_v1')) {
            // Eliminar todas las cuentas viejas en texto plano o saldos alterados
            localStorage.removeItem('users');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('casino_round');
            localStorage.removeItem('casino_roulette_history');
            localStorage.removeItem('casino_user_data');
            localStorage.removeItem('casino_auth_token');
            localStorage.removeItem('casino_auth_v3_wiped');
            localStorage.setItem('casino_wipe_cloud_v1', 'true');
            console.log('[CasinoEngine] Cuentas obsoletas eliminadas. Sistema listo para Supabase Cloud.');
        }
    }

    /* -------------------------------------------------------------
       2. INICIALIZACIÓN DE SUPABASE (Online Cloud 24/7)
    ---------------------------------------------------------------- */
    initSupabase() {
        const cfg = window.CASINO_SUPABASE_CONFIG;
        const isConfigured = cfg && cfg.url && cfg.anonKey && 
                             !cfg.url.includes('TU_PROYECTO') && 
                             !cfg.anonKey.includes('TU_SUPABASE_ANON_KEY');

        this.supabaseConfigured = isConfigured;

        if (!isConfigured) {
            console.warn('[CasinoEngine] Supabase no está configurado aún en shared/supabase-config.js. Se requiere para autenticación online 24/7.');
            return;
        }

        if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
            this.setupSupabaseClient(cfg.url, cfg.anonKey);
        } else {
            // Cargar Supabase SDK dinámicamente si no está en el HTML
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = () => {
                this.setupSupabaseClient(cfg.url, cfg.anonKey);
            };
            document.head.appendChild(script);
        }
    }

    setupSupabaseClient(url, key) {
        try {
            this.supabase = window.supabase.createClient(url, key);

            // Escuchar cambios de autenticación
            this.supabase.auth.onAuthStateChange(async (event, session) => {
                if (session && session.user) {
                    await this.fetchUserProfile();
                } else if (event === 'SIGNED_OUT') {
                    this.logoutLocal();
                    this.updateHeaderUI();
                }
            });

            // Suscribirse a cambios en tiempo real en la tabla profiles
            this.supabase
                .channel('realtime_profiles')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
                    if (this.user && payload.new && payload.new.id === this.user.id) {
                        this.saveUserCache(payload.new);
                        this.updateHeaderUI();
                    }
                })
                .subscribe();

            // Suscribirse a comunicados oficiales en tiempo real
            this.supabase
                .channel('realtime_announcements')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, (payload) => {
                    this.handleRealtimeAnnouncement(payload);
                })
                .subscribe();

            // Sincronizar usuario actual si ya hay sesión activa
            this.fetchUserProfile();
        } catch (e) {
            console.error('[CasinoEngine] Error al inicializar cliente Supabase:', e);
        }
    }

    /* -------------------------------------------------------------
       3. AUTENTICACIÓN CON SUPABASE (Login, Register, Logout)
    ---------------------------------------------------------------- */
    async loginWithSupabase(identifier, password) {
        if (!this.supabaseConfigured || !this.supabase) {
            return {
                success: false,
                error: 'Debes configurar tu URL y Anon Key de Supabase en shared/supabase-config.js para jugar online.'
            };
        }

        const id = identifier.trim();
        const email = id.includes('@') ? id : `${id.toLowerCase().replace(/[^a-z0-9_]/g, '')}@casinoac.app`;

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                return { success: false, error: 'Usuario o contraseña incorrectos.' };
            }

            const profile = await this.fetchUserProfile();
            return { success: true, user: profile };
        } catch (err) {
            return { success: false, error: err.message || 'Error de conexión con Supabase.' };
        }
    }

    async registerWithSupabase(rawUsername, password) {
        if (!this.supabaseConfigured || !this.supabase) {
            return {
                success: false,
                error: 'Debes configurar tu URL y Anon Key de Supabase en shared/supabase-config.js para jugar online.'
            };
        }

        const cleanUser = rawUsername.trim();
        if (cleanUser.length < 3) {
            return { success: false, error: 'El nombre de usuario debe tener al menos 3 caracteres.' };
        }
        if (password.length < 6) {
            return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
        }

        const email = cleanUser.includes('@') ? cleanUser : `${cleanUser.toLowerCase().replace(/[^a-z0-9_]/g, '')}@casinoac.app`;

        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: cleanUser
                    }
                }
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    return { success: false, error: 'Ese nombre de usuario ya está registrado.' };
                }
                return { success: false, error: error.message };
            }

            // Esperar un breve instante para que el trigger de Supabase inserte el perfil
            await new Promise(r => setTimeout(r, 600));

            // Iniciar sesión inmediatamente si no fue automático
            if (!data.session) {
                await this.supabase.auth.signInWithPassword({ email, password });
            }

            const profile = await this.fetchUserProfile();
            return { success: true, user: profile };
        } catch (err) {
            return { success: false, error: err.message || 'Error al crear la cuenta en Supabase.' };
        }
    }

    async logoutSupabase() {
        if (this.supabase) {
            try {
                await this.supabase.auth.signOut();
            } catch (e) {}
        }
        this.logoutLocal();
    }

    logoutLocal() {
        this.user = null;
        localStorage.removeItem('casino_user_data');
        localStorage.removeItem('casino_auth_token');
    }

    /* -------------------------------------------------------------
       4. GESTIÓN DE PERFILES Y SINCRONIZACIÓN EN LA NUBE
    ---------------------------------------------------------------- */
    async fetchUserProfile() {
        if (!this.supabase) return this.getCurrentUser();

        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) {
                return null;
            }

            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile) {
                this.saveUserCache(profile);
                this.updateHeaderUI();
                return profile;
            } else {
                // Perfil no encontrado (fallback de inicialización manual)
                const newProfile = {
                    id: user.id,
                    username: user.user_metadata?.username || user.email.split('@')[0],
                    saldo: 10000,
                    level: 1,
                    xp: 0,
                    coins: 100,
                    avatar: 'user',
                    last_bonus: 0
                };
                await this.supabase.from('profiles').insert([newProfile]);
                this.saveUserCache(newProfile);
                this.updateHeaderUI();
                return newProfile;
            }
        } catch (err) {
            console.warn('[CasinoEngine] Error al consultar perfil en Supabase:', err);
            return this.getCurrentUser();
        }
    }

    syncProfileToCloud() {
        if (!this.supabase || !this.user || !this.user.id) return;

        // Debounce de sincronización en segundo plano para evitar saturar la base de datos
        clearTimeout(this.cloudSyncTimeout);
        this.cloudSyncTimeout = setTimeout(async () => {
            try {
                await this.supabase.from('profiles').update({
                    saldo: this.user.saldo,
                    level: this.user.level,
                    xp: this.user.xp,
                    coins: this.user.coins,
                    avatar: this.user.avatar,
                    last_bonus: this.user.last_bonus,
                    updated_at: new Date().toISOString()
                }).eq('id', this.user.id);
            } catch (err) {
                console.warn('[CasinoEngine] Error al sincronizar con Supabase Cloud:', err);
            }
        }, 150);
    }

    syncFromStorage() {
        try {
            const rawUser = localStorage.getItem('casino_user_data');
            this.user = rawUser ? JSON.parse(rawUser) : null;

            if (this.user) {
                this.user.saldo = Math.max(0, Math.floor(Number(this.user.saldo) || 0));
                this.user.level = Math.max(1, Math.floor(Number(this.user.level) || 1));
                this.user.xp = Math.max(0, Math.floor(Number(this.user.xp) || 0));
                this.user.coins = Math.max(0, Math.floor(Number(this.user.coins) || 0));
            }
        } catch (e) {
            this.user = null;
        }
    }

    saveUserCache(userData) {
        if (!userData) return;
        this.user = {
            ...(this.user || {}),
            ...userData,
            saldo: Math.max(0, Math.floor(Number(userData.saldo) || 0))
        };
        localStorage.setItem('casino_user_data', JSON.stringify(this.user));
    }

    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'casino_user_data') {
                this.syncFromStorage();
                this.updateHeaderUI();
            }
        });
    }

    getCurrentUser() {
        this.syncFromStorage();
        return this.user;
    }

    requireAuth(redirectPath = '../index.html') {
        this.syncFromStorage();
        if (!this.user) {
            window.location.href = redirectPath;
            return false;
        }
        return true;
    }

    getSaldo() {
        const user = this.getCurrentUser();
        return user ? Math.max(0, Math.floor(user.saldo)) : 0;
    }

    /* -------------------------------------------------------------
       5. TIENDA, BONO DIARIO Y CANJE DE FICHAS VIP
    ---------------------------------------------------------------- */
    async claimDailyBonus() {
        const user = this.getCurrentUser();
        if (!user) return { success: false, error: 'Debes iniciar sesión.' };

        const now = Date.now();
        const last = Number(user.last_bonus) || 0;
        const cooldown = 86400000; // 24 horas

        if (now - last < cooldown) {
            const hrs = Math.ceil((cooldown - (now - last)) / (1000 * 60 * 60));
            return { success: false, error: `Ya reclamaste tu bono diario. Vuelve en ${hrs} horas.` };
        }

        user.saldo = Math.max(0, Math.floor(user.saldo + 2000));
        user.last_bonus = now;

        this.saveUserCache(user);
        this.updateHeaderUI();
        this.syncProfileToCloud();

        return { success: true, saldo: user.saldo };
    }

    async exchangeCoins() {
        const user = this.getCurrentUser();
        if (!user) return { success: false, error: 'Debes iniciar sesión.' };

        if ((user.coins || 0) < 50) {
            return { success: false, error: 'Necesitas al menos 50 fichas VIP para canjear.' };
        }

        user.coins -= 50;
        user.saldo = Math.max(0, Math.floor(user.saldo + 1000));

        this.saveUserCache(user);
        this.updateHeaderUI();
        this.syncProfileToCloud();

        return { success: true, saldo: user.saldo, coins: user.coins };
    }

    async buyAvatar(avatarKey, catalog) {
        const user = this.getCurrentUser();
        if (!user) return { success: false, error: 'Debes iniciar sesión.' };

        const item = catalog[avatarKey];
        if (!item || !item.price || item.price <= 0) {
            return { success: false, error: 'Avatar no válido en catálogo.' };
        }

        if (user.saldo < item.price) {
            return { success: false, error: 'Saldo insuficiente para comprar este avatar.' };
        }

        user.saldo = Math.max(0, Math.floor(user.saldo - item.price));
        user.avatar = avatarKey;

        this.saveUserCache(user);
        this.updateHeaderUI();
        this.syncProfileToCloud();

        return { success: true, saldo: user.saldo, avatar: avatarKey, name: item.name };
    }

    /* -------------------------------------------------------------
       6. CSPRNG (Web Crypto API - Sin Sesgo)
    ---------------------------------------------------------------- */
    randomFloat() {
        const buf = new Uint32Array(1);
        window.crypto.getRandomValues(buf);
        return buf[0] / 4294967296;
    }

    randomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        if (min >= max) return min;

        const range = max - min + 1;
        const maxUint32 = 4294967296;
        const limit = Math.floor(maxUint32 / range) * range;

        const buf = new Uint32Array(1);
        let rand;
        do {
            window.crypto.getRandomValues(buf);
            rand = buf[0];
        } while (rand >= limit);

        return min + (rand % range);
    }

    shuffleArray(array) {
        const a = [...array];
        for (let i = a.length - 1; i > 0; i--) {
            const j = this.randomInt(0, i);
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    /* -------------------------------------------------------------
       7. SISTEMA DE TRANSACCIONES ATÓMICAS POR RONDA (Anti-Duplicación)
    ---------------------------------------------------------------- */
    validateBet(rawAmount) {
        this.syncFromStorage();
        const user = this.getCurrentUser();
        if (!user) {
            return { valid: false, error: 'Debes iniciar sesión para jugar.' };
        }

        const amount = Number(rawAmount);
        if (isNaN(amount) || !Number.isInteger(amount)) {
            return { valid: false, error: 'La apuesta debe ser un número entero válido.' };
        }

        if (amount <= 0) {
            return { valid: false, error: 'La apuesta debe ser mayor a 0 créditos.' };
        }

        if (amount > user.saldo) {
            return { valid: false, error: `Saldo insuficiente. Tienes ${user.saldo.toLocaleString()} créditos.` };
        }

        return { valid: true, amount };
    }

    startRound(gameId, rawAmount, options = {}) {
        this.syncFromStorage();
        const validation = this.validateBet(rawAmount);
        if (!validation.valid) {
            this.showToast(validation.error, 'error');
            this.playSound('lose');
            return null;
        }

        const allowConcurrent = options.allowConcurrent || gameId.startsWith('plinko');
        if (!allowConcurrent) {
            for (const active of this.activeRounds.values()) {
                if (active.gameId === gameId && active.status === 'ACTIVE') {
                    this.showToast('Ya tienes una ronda en curso en este juego.', 'error');
                    return null;
                }
            }
        }

        const user = this.getCurrentUser();
        const betAmount = validation.amount;

        // Descuento atómico inmediato en memoria
        user.saldo = Math.max(0, Math.floor(user.saldo - betAmount));
        const earnedXP = Math.floor(betAmount / 50);
        if (earnedXP > 0) this.addXP(earnedXP);

        this.saveUserCache(user);

        const roundId = (typeof crypto.randomUUID === 'function')
            ? crypto.randomUUID()
            : (`rnd_${Date.now()}_${this.randomInt(100000, 999999)}`);

        const round = Object.freeze({
            roundId,
            gameId,
            betAmount,
            initialBet: betAmount,
            status: 'ACTIVE',
            createdAt: Date.now()
        });

        this.activeRounds.set(roundId, { ...round });

        this.updateHeaderUI();
        this.playSound('chip');
        this.syncProfileToCloud();

        return { roundId, betAmount };
    }

    addExtraBet(roundId, extraAmount) {
        this.syncFromStorage();
        if (!this.activeRounds.has(roundId)) {
            this.showToast('Ronda no encontrada para doblar apuesta.', 'error');
            return false;
        }

        const round = this.activeRounds.get(roundId);
        if (round.status !== 'ACTIVE') {
            this.showToast('La ronda no está activa.', 'error');
            return false;
        }

        const amount = Number(extraAmount);
        if (isNaN(amount) || amount <= 0 || !Number.isInteger(amount)) {
            return false;
        }

        const user = this.getCurrentUser();
        if (!user || user.saldo < amount) {
            this.showToast('Saldo insuficiente para doblar la apuesta.', 'error');
            return false;
        }

        user.saldo = Math.max(0, Math.floor(user.saldo - amount));
        round.betAmount += amount;

        const earnedXP = Math.floor(amount / 50);
        if (earnedXP > 0) this.addXP(earnedXP);

        this.saveUserCache(user);
        this.updateHeaderUI();
        this.playSound('chip');
        this.syncProfileToCloud();

        return true;
    }

    settleRound(roundId, multiplier = 0, options = {}) {
        // Idempotencia Estricta Anti-Duplicación: si no existe o ya fue liquidada, abortar
        if (!this.activeRounds.has(roundId) || this.settledRounds.has(roundId)) {
            console.warn(`[CasinoEngine] Intento de liquidación duplicada abortado para ronda: ${roundId}`);
            return false;
        }

        const round = this.activeRounds.get(roundId);
        if (round.status !== 'ACTIVE') {
            return false;
        }

        round.status = 'SETTLED';
        this.settledRounds.add(roundId);
        this.activeRounds.delete(roundId);

        const mult = Math.max(0, Number(multiplier) || 0);
        const payout = Math.floor(round.betAmount * mult);

        this.syncFromStorage();
        const user = this.getCurrentUser();

        if (user && payout > 0) {
            user.saldo = Math.max(0, Math.floor(user.saldo + payout));
            const winXP = Math.floor(payout / 100);
            if (winXP > 0) this.addXP(winXP);

            this.saveUserCache(user);
            this.updateHeaderUI();

            if (options.showToast !== false) {
                const multText = mult > 1 ? ` (x${mult.toFixed(2)})` : '';
                this.showToast(`¡Ganaste ${payout.toLocaleString()} créditos${multText}!`, 'win');
            }

            if (mult >= 8 || payout >= 4000) {
                this.playSound('jackpot');
            } else {
                this.playSound('win');
            }
        } else if (payout === 0 && options.recordLoss !== false) {
            this.playSound('lose');
        }

        // Sincronizar nuevo saldo con la nube Supabase
        this.syncProfileToCloud();

        return {
            success: true,
            payout,
            multiplier: mult,
            betAmount: round.betAmount
        };
    }

    recordLoss(amount) {
        this.playSound('lose');
    }

    /* -------------------------------------------------------------
       8. CURVA DE PROGRESIÓN (XP & Niveles)
    ---------------------------------------------------------------- */
    addXP(points) {
        const user = this.getCurrentUser();
        if (!user || points <= 0) return;

        user.xp = (user.xp || 0) + Math.floor(points);
        let xpNeeded = Math.floor(500 * Math.pow(1.35, (user.level || 1) - 1));

        let leveledUp = false;
        let rewardCredits = 0;
        while (user.xp >= xpNeeded) {
            user.level = (user.level || 1) + 1;
            user.xp -= xpNeeded;
            const rewardCoins = user.level * 25;
            user.coins = (user.coins || 0) + rewardCoins;
            rewardCredits += user.level * 150;
            user.saldo = Math.max(0, Math.floor((user.saldo || 0) + user.level * 150));
            leveledUp = true;
            xpNeeded = Math.floor(500 * Math.pow(1.35, user.level - 1));
        }

        if (leveledUp) {
            this.showToast(`¡Subiste al nivel ${user.level}! Recibes +${rewardCredits} créditos.`, 'win', 4500);
            this.playSound('jackpot');
        }
        this.saveUserCache(user);
    }

    /* -------------------------------------------------------------
       9. AUDIO SINTETIZADO (Web Audio API)
    ---------------------------------------------------------------- */
    initAudio() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) this.audioCtx = new AudioContext();
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    toggleSound() {
        this.soundMuted = !this.soundMuted;
        localStorage.setItem('casino_sound_muted', this.soundMuted);
        const icon = document.getElementById('soundToggleIcon');
        if (icon) {
            icon.className = this.soundMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
        }
        this.showToast(this.soundMuted ? "Sonido desactivado" : "Sonido activado", "info");
    }

    playSound(type = 'click') {
        if (this.soundMuted) return;
        try {
            this.initAudio();
            if (!this.audioCtx) return;

            const t = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            switch (type) {
                case 'click':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600, t);
                    osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);
                    gain.gain.setValueAtTime(0.2, t);
                    gain.gain.linearRampToValueAtTime(0.01, t + 0.05);
                    osc.start(t);
                    osc.stop(t + 0.05);
                    break;

                case 'chip':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(1200, t);
                    osc.frequency.exponentialRampToValueAtTime(800, t + 0.08);
                    gain.gain.setValueAtTime(0.3, t);
                    gain.gain.linearRampToValueAtTime(0.01, t + 0.08);
                    osc.start(t);
                    osc.stop(t + 0.08);
                    break;

                case 'card':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(300, t);
                    osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);
                    gain.gain.setValueAtTime(0.25, t);
                    gain.gain.linearRampToValueAtTime(0.01, t + 0.08);
                    osc.start(t);
                    osc.stop(t + 0.08);
                    break;

                case 'win':
                    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                        const subOsc = this.audioCtx.createOscillator();
                        const subGain = this.audioCtx.createGain();
                        subOsc.connect(subGain);
                        subGain.connect(this.audioCtx.destination);
                        subOsc.type = 'triangle';
                        subOsc.frequency.setValueAtTime(freq, t + i * 0.09);
                        subGain.gain.setValueAtTime(0.25, t + i * 0.09);
                        subGain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.25);
                        subOsc.start(t + i * 0.09);
                        subOsc.stop(t + i * 0.09 + 0.25);
                    });
                    break;

                case 'jackpot':
                    [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, i) => {
                        const subOsc = this.audioCtx.createOscillator();
                        const subGain = this.audioCtx.createGain();
                        subOsc.connect(subGain);
                        subGain.connect(this.audioCtx.destination);
                        subOsc.type = 'square';
                        subOsc.frequency.setValueAtTime(freq, t + i * 0.12);
                        subGain.gain.setValueAtTime(0.2, t + i * 0.12);
                        subGain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.4);
                        subOsc.start(t + i * 0.12);
                        subOsc.stop(t + i * 0.12 + 0.4);
                    });
                    break;

                case 'lose':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(280, t);
                    osc.frequency.linearRampToValueAtTime(140, t + 0.35);
                    gain.gain.setValueAtTime(0.25, t);
                    gain.gain.linearRampToValueAtTime(0.01, t + 0.35);
                    osc.start(t);
                    osc.stop(t + 0.35);
                    break;

                case 'explosion':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(140, t);
                    osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);
                    gain.gain.setValueAtTime(0.4, t);
                    gain.gain.linearRampToValueAtTime(0.01, t + 0.4);
                    osc.start(t);
                    osc.stop(t + 0.4);
                    break;

                case 'spin':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440, t);
                    osc.frequency.exponentialRampToValueAtTime(880, t + 0.15);
                    gain.gain.setValueAtTime(0.15, t);
                    gain.gain.linearRampToValueAtTime(0.01, t + 0.15);
                    osc.start(t);
                    osc.stop(t + 0.15);
                    break;

                case 'chicken_hop':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(400, t);
                    osc.frequency.exponentialRampToValueAtTime(900, t + 0.12);
                    gain.gain.setValueAtTime(0.25, t);
                    gain.gain.linearRampToValueAtTime(0.01, t + 0.12);
                    osc.start(t);
                    osc.stop(t + 0.12);
                    break;

                case 'chicken_crash':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(750, t);
                    osc.frequency.linearRampToValueAtTime(150, t + 0.35);
                    gain.gain.setValueAtTime(0.4, t);
                    gain.gain.linearRampToValueAtTime(0.01, t + 0.35);
                    osc.start(t);
                    osc.stop(t + 0.35);
                    break;
            }
        } catch (e) {
            // Audio no disponible
        }
    }

    /* -------------------------------------------------------------
       10. UI UNIVERSAL
    ---------------------------------------------------------------- */
    renderHeader(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const title = options.title || 'Casino AC';
        const backUrl = options.backUrl || '../index.html';
        const user = this.getCurrentUser() || { username: 'Invitado', saldo: 0, level: 1, xp: 0 };
        const username = user.username || 'Invitado';

        container.innerHTML = `
            <header class="casino-nav-header">
                <div class="casino-nav-left">
                    <a href="${backUrl}" class="casino-nav-btn" id="backMenuBtn">
                        <i class="fas fa-arrow-left"></i> Menú
                    </a>
                    <span class="casino-game-title">${title}</span>
                </div>

                <div class="casino-nav-right">
                    <div class="casino-user-badge">
                        <div class="casino-avatar-circle">
                            <i class="fas fa-user"></i>
                        </div>
                        <div>
                            <span style="font-weight: 700; font-size: 13px;">${username}</span>
                            <span class="casino-level-pill" id="headerLevelPill">Nvl ${user.level || 1}</span>
                        </div>
                    </div>

                    <div class="casino-balance-pill" id="casinoGlobalBalance">
                        <img src="${this.assetBase}ui/coin.svg" alt="coin" style="width: 20px; height: 20px; vertical-align: middle;">
                        <span id="engineDisplaySaldo">${Math.max(0, Math.floor(user.saldo)).toLocaleString()}</span>
                    </div>

                    <button class="casino-nav-btn" id="soundToggleBtn" title="Activar/Silenciar sonido">
                        <i class="${this.soundMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up'}" id="soundToggleIcon"></i>
                    </button>
                </div>
            </header>
        `;

        const soundBtn = document.getElementById('soundToggleBtn');
        if (soundBtn) soundBtn.addEventListener('click', () => this.toggleSound());

        const backBtn = document.getElementById('backMenuBtn');
        if (backBtn) backBtn.addEventListener('click', () => this.playSound('click'));
    }

    updateHeaderUI() {
        const user = this.getCurrentUser();
        if (!user) return;

        const saldoEl = document.getElementById('engineDisplaySaldo');
        const legacySaldo = document.getElementById('saldo');
        const legacyDisplaySaldo = document.getElementById('displaySaldo');

        const formatted = Math.max(0, Math.floor(user.saldo)).toLocaleString();

        [saldoEl, legacySaldo, legacyDisplaySaldo].forEach(el => {
            if (el) {
                el.innerText = formatted;
                el.parentElement?.classList.add('win-anim');
                setTimeout(() => el.parentElement?.classList.remove('win-anim'), 600);
            }
        });

        const levelPills = document.querySelectorAll('.casino-level-pill, #userLevel, #headerLevelPill');
        levelPills.forEach(p => p.innerText = `Nvl ${user.level || 1}`);

        const xpEl = document.getElementById('userXP');
        if (xpEl) xpEl.innerText = user.xp || 0;

        const coinsEl = document.getElementById('userCoins');
        if (coinsEl) coinsEl.innerText = user.coins || 0;
    }

    setupChips(containerSelector, inputSelector) {
        const container = document.querySelector(containerSelector);
        const input = document.querySelector(inputSelector);
        if (!container || !input) return;

        const chips = container.querySelectorAll('.casino-chip, .chip-btn');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('active', 'selected'));
                chip.classList.add('active', 'selected');
                const val = chip.dataset.amount || chip.dataset.value;
                if (val) {
                    input.value = val;
                    this.playSound('chip');
                }
            });
        });
    }

    showToast(message, type = 'info', duration = 3500) {
        let container = document.getElementById('casino-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'casino-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `casino-toast ${type}`;
        
        let iconHtml = `<i class="fas fa-info-circle" style="color: #00f2fe;"></i>`;
        if (type === 'success' || type === 'win') {
            iconHtml = `<img src="${this.assetBase}ui/coin.svg" style="width: 22px; height: 22px;">`;
        } else if (type === 'error') {
            iconHtml = `<i class="fas fa-times-circle" style="color: #ff4757;"></i>`;
        }

        toast.innerHTML = `<span>${iconHtml}</span> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }

    /* -------------------------------------------------------------
       12. COMUNICADOS DE ADMINISTRACIÓN Y CENTRO DE AVISOS
    ---------------------------------------------------------------- */
    handleRealtimeAnnouncement(payload) {
        if (!payload) return;
        if (payload.eventType === 'INSERT' && payload.new) {
            const dot = document.getElementById('notificationDot');
            if (dot) dot.style.display = 'inline-block';
            this.showToast(`Nuevo comunicado oficial: ${payload.new.title}`, 'info');
            this.playSound('card');
        }
        window.dispatchEvent(new CustomEvent('casino:announcement_changed', { detail: payload }));
    }

    async getAnnouncements() {
        const defaultNotices = [
            {
                id: 'default-welcome',
                title: 'Bienvenido a Casino Royal AC',
                content: 'Disfruta de nuestros juegos con probabilidades matemáticas transparentes, pagos instantáneos y bonos diarios. Si tienes dudas o sugerencias, comunícate con nuestro equipo.',
                author: 'Dirección General',
                badge: 'Novedad',
                created_at: new Date(Date.now() - 3600000).toISOString()
            }
        ];

        let notices = [];
        if (this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from('announcements')
                    .select('*')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });

                if (!error && Array.isArray(data) && data.length > 0) {
                    notices = data;
                    localStorage.setItem('casino_announcements_cache', JSON.stringify(notices));
                    return notices;
                }
            } catch (e) {
                console.warn('[CasinoEngine] Supabase announcements fetch error:', e);
            }
        }

        try {
            const cached = localStorage.getItem('casino_announcements_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {}

        return defaultNotices;
    }

    async createAnnouncement({ title, content, author = 'Administración', badge = 'Novedad' }) {
        if (!title || !title.trim()) {
            return { success: false, error: 'El título es obligatorio.' };
        }
        if (!content || !content.trim()) {
            return { success: false, error: 'El contenido del comunicado es obligatorio.' };
        }

        const newNotice = {
            title: title.trim(),
            content: content.trim(),
            author: (author || 'Administración').trim(),
            badge: (badge || 'Novedad').trim(),
            is_active: true,
            created_at: new Date().toISOString()
        };

        let isTableMissing = false;
        if (this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from('announcements')
                    .insert([newNotice])
                    .select()
                    .single();

                if (!error && data) {
                    const list = await this.getAnnouncements();
                    const updated = [data, ...list.filter(item => item.id !== data.id)];
                    localStorage.setItem('casino_announcements_cache', JSON.stringify(updated));
                    return { success: true, data, isLocal: false };
                } else if (error) {
                    console.warn('[CasinoEngine] Error al insertar comunicado en Supabase:', error.message);
                    if (error.code === 'PGRST205' || (error.message && error.message.includes('not find the table'))) {
                        isTableMissing = true;
                    }
                }
            } catch (err) {
                console.warn('[CasinoEngine] Excepción de red en Supabase:', err);
            }
        }

        // Fallback local garantizado para pruebas inmediatas
        const localNotice = {
            ...newNotice,
            id: 'local-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
        };
        const list = await this.getAnnouncements();
        const updated = [localNotice, ...list.filter(item => item.id !== localNotice.id)];
        localStorage.setItem('casino_announcements_cache', JSON.stringify(updated));
        return { success: true, data: localNotice, isLocal: true, missingTable: isTableMissing };
    }

    async checkAnnouncementsTableStatus() {
        if (!this.supabase) return { connected: false, missingTable: true };
        try {
            const { error } = await this.supabase
                .from('announcements')
                .select('id')
                .limit(1);

            if (error) {
                const isMissing = error.code === 'PGRST205' || 
                                  (error.message && error.message.includes('not find the table'));
                return { connected: false, missingTable: isMissing, error: error.message };
            }
            return { connected: true, missingTable: false };
        } catch (e) {
            return { connected: false, missingTable: true, error: e.message };
        }
    }

    async deleteAnnouncement(id) {
        if (!id) return { success: false, error: 'ID no válido.' };

        if (this.supabase && !id.toString().startsWith('local-') && !id.toString().startsWith('default-')) {
            try {
                await this.supabase
                    .from('announcements')
                    .delete()
                    .eq('id', id);
            } catch (err) {
                console.warn('[CasinoEngine] Error al eliminar de Supabase:', err);
            }
        }

        try {
            const list = await this.getAnnouncements();
            const updated = list.filter(item => item.id !== id);
            localStorage.setItem('casino_announcements_cache', JSON.stringify(updated));
        } catch (e) {}

        return { success: true };
    }

    hasUnreadAnnouncements(notices) {
        if (!Array.isArray(notices) || notices.length === 0) return false;
        const lastRead = Number(localStorage.getItem('casino_last_viewed_announcement_ts') || 0);
        const newest = new Date(notices[0].created_at || Date.now()).getTime();
        return newest > lastRead;
    }

    markAnnouncementsAsRead(notices) {
        const newest = notices && notices.length > 0 
            ? new Date(notices[0].created_at || Date.now()).getTime() 
            : Date.now();
        localStorage.setItem('casino_last_viewed_announcement_ts', newest.toString());
        const dot = document.getElementById('notificationDot');
        if (dot) dot.style.display = 'none';
    }
}

window.casino = new CasinoEngine();
