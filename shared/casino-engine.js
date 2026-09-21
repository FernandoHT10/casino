/**
 * Casino AC - Shared Engine (v2.0)
 * Manejo centralizado de sesión, saldo, apuestas blindadas, audio sintetizado,
 * curva de nivel exponencial calibrada y soporte para assets vectoriales SVG.
 */

class CasinoEngine {
    constructor() {
        this.currentUser = null;
        this.users = {};
        this.soundMuted = localStorage.getItem('casino_sound_muted') === 'true';
        this.audioCtx = null;
        this.assetBase = window.location.pathname.includes('/games/') ? '../assets/' : 'assets/';
        this.initUsers();
    }

    initUsers() {
        try {
            this.users = JSON.parse(localStorage.getItem('users')) || {};
            this.currentUser = localStorage.getItem('currentUser');
            
            if (this.currentUser && this.users[this.currentUser]) {
                const u = this.users[this.currentUser];
                if (typeof u.saldo !== 'number' || isNaN(u.saldo)) u.saldo = 10000;
                else u.saldo = Math.floor(u.saldo);
                if (!u.level) u.level = 1;
                if (!u.xp) u.xp = 0;
                if (!u.coins) u.coins = 100;
                this.saveUsers();
            }
        } catch (e) {
            console.error("Error al inicializar datos de usuario:", e);
            this.users = {};
            this.currentUser = null;
        }
    }

    saveUsers() {
        localStorage.setItem('users', JSON.stringify(this.users));
    }

    getCurrentUser() {
        if (this.currentUser && this.users[this.currentUser]) {
            return this.users[this.currentUser];
        }
        return null;
    }

    requireAuth(redirectPath = '../index.html') {
        const user = this.getCurrentUser();
        if (!user) {
            window.location.href = redirectPath;
            return false;
        }
        return true;
    }

    getSaldo() {
        const user = this.getCurrentUser();
        return user ? Math.floor(user.saldo) : 0;
    }

    /* -------------------------------------------------------------
       AUDIO SINTETIZADO (Web Audio API: 100% nativo)
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
            }
        } catch (e) {
            // Audio no disponible
        }
    }

    /* -------------------------------------------------------------
       VALIDACIÓN ESTRICTA DE APUESTAS
    ---------------------------------------------------------------- */
    validateBet(rawAmount) {
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

    /* -------------------------------------------------------------
       GESTIÓN DE ECONOMÍA, CRÉDITOS Y XP CALIBRADA
    ---------------------------------------------------------------- */
    deductBet(amount) {
        const validation = this.validateBet(amount);
        if (!validation.valid) {
            this.showToast(validation.error, 'error');
            this.playSound('lose');
            return false;
        }

        const user = this.getCurrentUser();
        user.saldo = Math.floor(user.saldo - validation.amount);
        
        // XP Calibrada: 1 XP cada 50 créditos apostados (evita subir de nivel al instante)
        const earnedXP = Math.floor(validation.amount / 50);
        if (earnedXP > 0) this.addXP(earnedXP);

        this.saveUsers();
        this.updateHeaderUI();
        this.playSound('chip');
        return true;
    }

    addPayout(amount, multiplier = 1, options = { showToast: true, label: 'Premio' }) {
        const user = this.getCurrentUser();
        if (!user) return 0;

        const payout = Math.floor(Number(amount));
        if (payout > 0) {
            user.saldo = Math.floor(user.saldo + payout);
            
            // XP adicional por ganar: 1 XP cada 100 créditos ganados
            const winXP = Math.floor(payout / 100);
            if (winXP > 0) this.addXP(winXP);

            this.saveUsers();
            this.updateHeaderUI();

            if (options.showToast) {
                const multText = multiplier > 1 ? ` (x${multiplier.toFixed(1)})` : '';
                this.showToast(`¡Ganaste ${payout.toLocaleString()} créditos${multText}!`, 'win');
            }

            if (multiplier >= 8 || payout >= 4000) {
                this.playSound('jackpot');
            } else {
                this.playSound('win');
            }
        }
        return payout;
    }

    recordLoss(amount) {
        this.playSound('lose');
    }

    // Curva Exponencial: 500 * (1.35)^(level-1)
    addXP(points) {
        const user = this.getCurrentUser();
        if (!user || points <= 0) return;

        user.xp = (user.xp || 0) + points;
        const xpNeeded = Math.floor(500 * Math.pow(1.35, (user.level || 1) - 1));

        if (user.xp >= xpNeeded) {
            user.level += 1;
            user.xp -= xpNeeded;
            const rewardCoins = user.level * 25;
            user.coins = (user.coins || 0) + rewardCoins;
            const rewardCredits = user.level * 150;
            user.saldo += rewardCredits;
            
            this.showToast(`⭐ ¡SUBISTE AL NIVEL ${user.level}! (+${rewardCredits} créditos, +${rewardCoins} fichas)`, 'win', 4500);
            this.playSound('jackpot');
        }
        this.saveUsers();
    }

    /* -------------------------------------------------------------
       UI: HEADER UNIVERSAL CON ASSETS SVG
    ---------------------------------------------------------------- */
    renderHeader(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const title = options.title || 'Casino AC';
        const backUrl = options.backUrl || '../index.html';
        const user = this.getCurrentUser() || { saldo: 0, level: 1, xp: 0 };
        const username = this.currentUser || 'Invitado';

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
                        <span id="engineDisplaySaldo">${Math.floor(user.saldo).toLocaleString()}</span>
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

        const formatted = Math.floor(user.saldo).toLocaleString();

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
}

window.casino = new CasinoEngine();
