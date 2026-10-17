/**
 * Casino Royal AC - Servidor Backend & API de Autenticación Real
 * Node.js (v24+), Express, SQLite Nativo (node:sqlite) y Criptografía Segura (scrypt / CSPRNG)
 */

const express = require('express');
const cors = require('cors');
const crypto = require('node:crypto');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

/* -------------------------------------------------------------
   BASE DE DATOS SQLITE NATIVA (casino.db)
---------------------------------------------------------------- */
const dbPath = path.join(__dirname, 'casino.db');
const db = new DatabaseSync(dbPath);

// Inicializar Tablas
db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        saldo INTEGER NOT NULL DEFAULT 10000,
        level INTEGER NOT NULL DEFAULT 1,
        xp INTEGER NOT NULL DEFAULT 0,
        coins INTEGER NOT NULL DEFAULT 100,
        avatar TEXT DEFAULT '👤',
        last_bonus INTEGER DEFAULT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rounds (
        round_id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        game_id TEXT NOT NULL,
        bet_amount INTEGER NOT NULL,
        status TEXT NOT NULL, -- 'ACTIVE', 'SETTLED'
        multiplier REAL DEFAULT 0,
        payout INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        settled_at INTEGER DEFAULT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
`);

console.log('[Casino DB] Base de datos SQLite inicializada correctamente.');

/* -------------------------------------------------------------
   UTILIDADES CRIPTOGRÁFICAS (scrypt / CSPRNG)
---------------------------------------------------------------- */
function generateSalt() {
    return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
    return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password, salt, storedHash) {
    const hash = hashPassword(password, salt);
    const hashBuf = Buffer.from(hash, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');
    if (hashBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, storedBuf);
}

function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

const AVATAR_CATALOG = Object.freeze({
    'crown': { price: 5000, name: 'Corona Rey', icon: '👑' },
    'diamond': { price: 5000, name: 'Diamante', icon: '💎' }
});

function calculateProgression(user, xpGained) {
    let xp = (user.xp || 0) + Math.floor(xpGained);
    let level = user.level || 1;
    let coins = user.coins || 0;
    let saldo = user.saldo;
    let xpNeeded = Math.floor(500 * Math.pow(1.35, level - 1));
    let leveledUp = false;

    while (xp >= xpNeeded) {
        level += 1;
        xp -= xpNeeded;
        coins += level * 25;
        saldo += level * 150;
        leveledUp = true;
        xpNeeded = Math.floor(500 * Math.pow(1.35, level - 1));
    }

    return { xp, level, coins, saldo, leveledUp };
}

/* -------------------------------------------------------------
   MIDDLEWARE DE AUTENTICACIÓN
---------------------------------------------------------------- */
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'No autorizado. Token de sesión no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];
    const sessionQuery = db.prepare('SELECT * FROM sessions WHERE token = ?');
    const session = sessionQuery.get(token);

    if (!session) {
        return res.status(401).json({ success: false, error: 'Sesión no válida o expirada.' });
    }

    if (Date.now() > session.expires_at) {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        return res.status(401).json({ success: false, error: 'Sesión expirada. Por favor ingresa nuevamente.' });
    }

    const userQuery = db.prepare('SELECT id, username, saldo, level, xp, coins, avatar, last_bonus, created_at FROM users WHERE id = ?');
    const user = userQuery.get(session.user_id);

    if (!user) {
        return res.status(401).json({ success: false, error: 'Usuario no encontrado.' });
    }

    req.user = user;
    req.sessionToken = token;
    next();
}

/* -------------------------------------------------------------
   ENDPOINTS DE AUTENTICACIÓN
---------------------------------------------------------------- */

// Registro de Usuario
app.post('/api/auth/register', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || typeof username !== 'string' || username.trim().length < 3) {
            return res.status(400).json({ success: false, error: 'El nombre de usuario debe tener al menos 3 caracteres.' });
        }

        const cleanUsername = username.trim();
        if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
            return res.status(400).json({ success: false, error: 'El nombre de usuario solo puede contener letras, números y guiones.' });
        }

        if (!password || typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        // Verificar existencia
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
        if (existing) {
            return res.status(409).json({ success: false, error: 'Ese nombre de usuario ya está registrado.' });
        }

        // Hasheo seguro con scrypt + salt aleatorio
        const salt = generateSalt();
        const passwordHash = hashPassword(password, salt);
        const now = Date.now();

        const insertUser = db.prepare(`
            INSERT INTO users (username, password_hash, salt, saldo, level, xp, coins, avatar, created_at, updated_at)
            VALUES (?, ?, ?, 10000, 1, 0, 100, '👤', ?, ?)
        `);
        const result = insertUser.run(cleanUsername, passwordHash, salt, now, now);
        const userId = Number(result.lastInsertRowid);

        // Crear token de sesión (Validez 7 días)
        const token = generateSessionToken();
        const expiresAt = now + (7 * 24 * 60 * 60 * 1000);
        db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, userId, now, expiresAt);

        const newUser = {
            id: userId,
            username: cleanUsername,
            saldo: 10000,
            level: 1,
            xp: 0,
            coins: 100,
            avatar: '👤',
            last_bonus: null
        };

        return res.status(201).json({
            success: true,
            message: 'Cuenta creada con éxito. +10,000 créditos de bono de bienvenida.',
            token,
            user: newUser
        });
    } catch (err) {
        console.error('[Auth Error] /register:', err);
        return res.status(500).json({ success: false, error: 'Error interno del servidor al registrar.' });
    }
});

// Inicio de Sesión
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Por favor completa usuario y contraseña.' });
        }

        const cleanUsername = username.trim();
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUsername);

        if (!user) {
            return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos.' });
        }

        // Verificación con timingSafeEqual contra ataques de canal lateral
        const isValid = verifyPassword(password, user.salt, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos.' });
        }

        // Crear sesión
        const token = generateSessionToken();
        const now = Date.now();
        const expiresAt = now + (7 * 24 * 60 * 60 * 1000);
        db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, user.id, now, expiresAt);

        return res.json({
            success: true,
            message: '¡Bienvenido de vuelta!',
            token,
            user: {
                id: user.id,
                username: user.username,
                saldo: user.saldo,
                level: user.level,
                xp: user.xp,
                coins: user.coins,
                avatar: user.avatar,
                last_bonus: user.last_bonus
            }
        });
    } catch (err) {
        console.error('[Auth Error] /login:', err);
        return res.status(500).json({ success: false, error: 'Error interno del servidor al iniciar sesión.' });
    }
});

// Perfil de Usuario Actual
app.get('/api/auth/me', requireAuth, (req, res) => {
    return res.json({
        success: true,
        user: req.user
    });
});

// Cierre de Sesión
app.post('/api/auth/logout', requireAuth, (req, res) => {
    try {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(req.sessionToken);
        return res.json({ success: true, message: 'Sesión cerrada correctamente.' });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Error al cerrar sesión.' });
    }
});

/* -------------------------------------------------------------
   ENDPOINTS ECONÓMICOS: TIENDA, BONOS Y CANJES
---------------------------------------------------------------- */

// Reclamar Bono Diario
app.post('/api/user/claim-bonus', requireAuth, (req, res) => {
    try {
        const user = req.user;
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000;

        if (user.last_bonus && (now - user.last_bonus < cooldown)) {
            const hoursLeft = Math.ceil((cooldown - (now - user.last_bonus)) / (1000 * 60 * 60));
            return res.status(400).json({ success: false, error: `Bono diario ya reclamado. Vuelve en ${hoursLeft}h.` });
        }

        const newSaldo = user.saldo + 2000;
        db.prepare('UPDATE users SET saldo = ?, last_bonus = ?, updated_at = ? WHERE id = ?').run(newSaldo, now, now, user.id);

        return res.json({
            success: true,
            message: '¡Bono diario de 2,000 créditos acreditado!',
            saldo: newSaldo,
            lastBonus: now
        });
    } catch (err) {
        console.error('[Error] /claim-bonus:', err);
        return res.status(500).json({ success: false, error: 'Error al reclamar bono diario.' });
    }
});

// Canjear Fichas VIP
app.post('/api/user/exchange-coins', requireAuth, (req, res) => {
    try {
        const user = req.user;
        if ((user.coins || 0) < 50) {
            return res.status(400).json({ success: false, error: 'Necesitas al menos 50 fichas VIP para canjear.' });
        }

        const newCoins = user.coins - 50;
        const newSaldo = user.saldo + 1000;
        const now = Date.now();

        db.prepare('UPDATE users SET saldo = ?, coins = ?, updated_at = ? WHERE id = ?').run(newSaldo, newCoins, now, user.id);

        return res.json({
            success: true,
            message: '¡Canjeaste 50 fichas VIP por 1,000 créditos!',
            saldo: newSaldo,
            coins: newCoins
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Error al canjear fichas.' });
    }
});

// Comprar Avatar
app.post('/api/user/buy-avatar', requireAuth, (req, res) => {
    try {
        const { avatarKey } = req.body;
        const item = AVATAR_CATALOG[avatarKey];

        if (!item) {
            return res.status(400).json({ success: false, error: 'Avatar no válido en catálogo.' });
        }

        const user = req.user;
        if (user.saldo < item.price) {
            return res.status(400).json({ success: false, error: `Saldo insuficiente. Requiere ${item.price.toLocaleString()} créditos.` });
        }

        const newSaldo = user.saldo - item.price;
        const now = Date.now();
        db.prepare('UPDATE users SET saldo = ?, avatar = ?, updated_at = ? WHERE id = ?').run(newSaldo, avatarKey, now, user.id);

        return res.json({
            success: true,
            message: `¡Avatar ${item.name} adquirido y equipado!`,
            saldo: newSaldo,
            avatar: avatarKey
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Error al comprar avatar.' });
    }
});

/* -------------------------------------------------------------
   ENDPOINTS TRANSACCIONALES DE JUEGO (Ticket/Round ID en DB)
---------------------------------------------------------------- */

// Iniciar Ronda
app.post('/api/round/start', requireAuth, (req, res) => {
    try {
        const { gameId, rawAmount } = req.body;
        const amount = Number(rawAmount);

        if (isNaN(amount) || !Number.isInteger(amount) || amount <= 0) {
            return res.status(400).json({ success: false, error: 'La apuesta debe ser un número entero mayor a 0.' });
        }

        const user = req.user;
        if (amount > user.saldo) {
            return res.status(400).json({ success: false, error: `Saldo insuficiente. Tienes ${user.saldo.toLocaleString()} créditos.` });
        }

        // Descuento atómico de saldo y cálculo de XP
        const newSaldo = user.saldo - amount;
        const prog = calculateProgression(user, Math.floor(amount / 50));
        prog.saldo = newSaldo + (prog.leveledUp ? (prog.level * 150) : 0);

        const roundId = crypto.randomUUID();
        const now = Date.now();

        // Guardar usuario y registrar ronda
        db.prepare(`
            UPDATE users SET saldo = ?, level = ?, xp = ?, coins = ?, updated_at = ? WHERE id = ?
        `).run(prog.saldo, prog.level, prog.xp, prog.coins, now, user.id);

        db.prepare(`
            INSERT INTO rounds (round_id, user_id, game_id, bet_amount, status, created_at)
            VALUES (?, ?, ?, ?, 'ACTIVE', ?)
        `).run(roundId, user.id, gameId || 'generic', amount, now);

        return res.json({
            success: true,
            roundId,
            betAmount: amount,
            saldo: prog.saldo,
            level: prog.level,
            xp: prog.xp,
            coins: prog.coins,
            leveledUp: prog.leveledUp
        });
    } catch (err) {
        console.error('[Round Error] /start:', err);
        return res.status(500).json({ success: false, error: 'Error al iniciar ronda en servidor.' });
    }
});

// Doblar / Añadir Apuesta
app.post('/api/round/extra-bet', requireAuth, (req, res) => {
    try {
        const { roundId, extraAmount } = req.body;
        const amount = Number(extraAmount);

        if (isNaN(amount) || !Number.isInteger(amount) || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Monto extra no válido.' });
        }

        const round = db.prepare('SELECT * FROM rounds WHERE round_id = ? AND user_id = ?').get(roundId, req.user.id);
        if (!round || round.status !== 'ACTIVE') {
            return res.status(400).json({ success: false, error: 'Ronda no activa o inexistente.' });
        }

        const user = req.user;
        if (amount > user.saldo) {
            return res.status(400).json({ success: false, error: 'Saldo insuficiente para doblar.' });
        }

        const newSaldo = user.saldo - amount;
        const newBet = round.bet_amount + amount;
        const now = Date.now();

        db.prepare('UPDATE users SET saldo = ?, updated_at = ? WHERE id = ?').run(newSaldo, now, user.id);
        db.prepare('UPDATE rounds SET bet_amount = ? WHERE round_id = ?').run(newBet, roundId);

        return res.json({
            success: true,
            betAmount: newBet,
            saldo: newSaldo
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Error al doblar apuesta.' });
    }
});

// Liquidar Ronda (Anti-Duplicación Idempotente)
app.post('/api/round/settle', requireAuth, (req, res) => {
    try {
        const { roundId, multiplier } = req.body;
        const mult = Math.max(0, Number(multiplier) || 0);

        const round = db.prepare('SELECT * FROM rounds WHERE round_id = ? AND user_id = ?').get(roundId, req.user.id);
        if (!round || round.status !== 'ACTIVE') {
            return res.status(400).json({ success: false, error: 'Ronda no encontrada o ya liquidada previamente.' });
        }

        const now = Date.now();
        const payout = Math.floor(round.bet_amount * mult);
        const user = req.user;

        let finalSaldo = user.saldo + payout;
        let finalLevel = user.level;
        let finalXP = user.xp;
        let finalCoins = user.coins;

        // Si ganó, calcular XP por victoria
        if (payout > 0) {
            const prog = calculateProgression(user, Math.floor(payout / 100));
            finalSaldo = finalSaldo + (prog.leveledUp ? (prog.level * 150) : 0);
            finalLevel = prog.level;
            finalXP = prog.xp;
            finalCoins = prog.coins;
        }

        // Marcar como SETTLED
        db.prepare(`
            UPDATE rounds SET status = 'SETTLED', multiplier = ?, payout = ?, settled_at = ? WHERE round_id = ?
        `).run(mult, payout, now, roundId);

        // Actualizar usuario
        db.prepare(`
            UPDATE users SET saldo = ?, level = ?, xp = ?, coins = ?, updated_at = ? WHERE id = ?
        `).run(finalSaldo, finalLevel, finalXP, finalCoins, now, user.id);

        return res.json({
            success: true,
            roundId,
            payout,
            multiplier: mult,
            saldo: finalSaldo,
            level: finalLevel,
            xp: finalXP,
            coins: finalCoins
        });
    } catch (err) {
        console.error('[Round Error] /settle:', err);
        return res.status(500).json({ success: false, error: 'Error al liquidar ronda.' });
    }
});

/* -------------------------------------------------------------
   RUTA PRINCIPAL Y CONTROL DE SALUD
---------------------------------------------------------------- */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: Date.now(), engine: 'Casino Royal AC v3.0' });
});

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  🎰 CASINO ROYAL AC - BACKEND INICIADO EN PUERTO ${PORT}`);
    console.log(`  🔗 Abre tu navegador en: http://localhost:${PORT}`);
    console.log(`====================================================`);
});
