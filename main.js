/**
 * Casino AC - Main Lobby Controller (v4.0 - Supabase Cloud Auth)
 */

const AVATAR_CATALOG = Object.freeze({
    'crown': { price: 5000, name: 'Corona Rey', icon: 'crown' },
    'diamond': { price: 5000, name: 'Diamante', icon: 'diamond' }
});

document.addEventListener('DOMContentLoaded', async () => {
    initParticles();
    await checkSession();
    setupAuthListeners();
    setupShopListeners();
    setupNotificationListeners();
    checkSupabaseSetupNotice();
});

// Canvas de Partículas Flotantes
function initParticles() {
    const canvas = document.getElementById('particlesCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const particles = [];
    const colors = ['#ffd700', '#ff6b35', '#00f2fe', '#ffffff', '#2ed573'];

    for (let i = 0; i < 50; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2.5 + 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedY: Math.random() * 0.6 + 0.2,
            speedX: (Math.random() - 0.5) * 0.4,
            opacity: Math.random() * 0.7 + 0.2
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.opacity;
            ctx.fill();

            p.y -= p.speedY;
            p.x += p.speedX;

            if (p.y < -10) {
                p.y = canvas.height + 10;
                p.x = Math.random() * canvas.width;
            }
        });
        requestAnimationFrame(animate);
    }
    animate();
}

// Comprobar si Supabase requiere configuración
function checkSupabaseSetupNotice() {
    const cfg = window.CASINO_SUPABASE_CONFIG;
    const isPlaceholder = !cfg || !cfg.url || cfg.url.includes('TU_PROYECTO');
    const authHeader = document.querySelector('.auth-header p');

    if (isPlaceholder && authHeader) {
        authHeader.innerHTML = `
            Ingresa con tu cuenta o crea una nueva para comenzar a jugar.<br>
            <span style="display: inline-block; margin-top: 8px; font-size: 11px; color: var(--gold); background: rgba(255,215,0,0.1); border: 1px dashed var(--gold); padding: 4px 10px; border-radius: 6px;">
                <i class="fas fa-key"></i> Conecta tu proyecto de Supabase en <code>shared/supabase-config.js</code>
            </span>
        `;
    }
}

// Comprobar Sesión de Usuario
async function checkSession() {
    const loginSection = document.getElementById('authSection');
    const menuSection = document.getElementById('menuSection');

    let user = casino.getCurrentUser();
    if (!user && casino.supabase) {
        user = await casino.fetchUserProfile();
    }

    if (user) {
        if (loginSection) loginSection.style.display = 'none';
        if (menuSection) menuSection.style.display = 'block';
        updateUserUI();
    } else {
        if (loginSection) loginSection.style.display = 'block';
        if (menuSection) menuSection.style.display = 'none';
    }
}

// Actualizar Datos de Usuario en Pantalla
function updateUserUI() {
    const user = casino.getCurrentUser();
    if (!user) return;

    const usernameEl = document.getElementById('displayUser');
    const saldoEl = document.getElementById('displaySaldo');
    const levelEl = document.getElementById('userLevel');
    const xpEl = document.getElementById('userXP');
    const coinsEl = document.getElementById('userCoins');
    const avatarEl = document.getElementById('userAvatarIcon');

    if (usernameEl) usernameEl.innerText = user.username || 'Jugador';
    if (saldoEl) saldoEl.innerText = Math.max(0, Math.floor(user.saldo)).toLocaleString();
    if (levelEl) levelEl.innerText = user.level || 1;
    if (xpEl) xpEl.innerText = user.xp || 0;
    if (coinsEl) coinsEl.innerText = user.coins || 0;
    if (avatarEl) {
        if (user.avatar === 'crown') avatarEl.innerHTML = '<i class="fas fa-crown" style="color: var(--gold);"></i>';
        else if (user.avatar === 'diamond') avatarEl.innerHTML = '<i class="fas fa-gem" style="color: #00f2fe;"></i>';
        else avatarEl.innerHTML = '<i class="fas fa-user"></i>';
    }
}

// Autenticación con Supabase Cloud
function setupAuthListeners() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const authMsg = document.getElementById('authMessage');

    function setAuthMsg(text, type = 'error') {
        if (!authMsg) return;
        authMsg.innerText = text;
        authMsg.style.color = type === 'success' ? '#2ed573' : '#ff4757';
    }

    // Iniciar Sesión Online
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const u = document.getElementById('username').value.trim();
            const p = document.getElementById('password').value.trim();

            if (!u || !p) {
                setAuthMsg('Por favor completa todos los campos.');
                casino.playSound('lose');
                return;
            }

            loginBtn.disabled = true;
            setAuthMsg('Comprobando credenciales...', 'success');

            const res = await casino.loginWithSupabase(u, p);
            loginBtn.disabled = false;

            if (res.success) {
                casino.playSound('win');
                setAuthMsg('Sesión iniciada. ¡Buena suerte!', 'success');
                setTimeout(() => checkSession(), 400);
            } else {
                setAuthMsg(res.error || 'Credenciales incorrectas.');
                casino.playSound('lose');
            }
        });
    }

    // Registrar Usuario Online
    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            const u = document.getElementById('username').value.trim();
            const p = document.getElementById('password').value.trim();

            if (!u || !p) {
                setAuthMsg('Por favor completa todos los campos.');
                casino.playSound('lose');
                return;
            }

            if (u.length < 3) {
                setAuthMsg('El usuario debe tener al menos 3 caracteres.');
                casino.playSound('lose');
                return;
            }

            if (p.length < 6) {
                setAuthMsg('La contraseña debe tener al menos 6 caracteres.');
                casino.playSound('lose');
                return;
            }

            registerBtn.disabled = true;
            setAuthMsg('Creando cuenta...', 'success');

            const res = await casino.registerWithSupabase(u, p);
            registerBtn.disabled = false;

            if (res.success) {
                casino.playSound('jackpot');
                setAuthMsg('Cuenta creada correctamente. Te acreditamos 10.000 créditos de bienvenida.', 'success');
                setTimeout(() => checkSession(), 400);
            } else {
                setAuthMsg(res.error || 'No se pudo crear la cuenta.');
                casino.playSound('lose');
            }
        });
    }

    // Cerrar Sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await casino.logoutSupabase();
            casino.playSound('click');
            checkSession();
        });
    }
}

// Tienda y Recompensas conectadas a la Nube
function setupShopListeners() {
    const shopBtn = document.getElementById('shopBtn');
    const shopModal = document.getElementById('shopModal');
    const closeShop = document.getElementById('closeShopBtn');

    let isProcessingClaim = false;
    let isProcessingExchange = false;
    let isProcessingAvatar = false;

    if (shopBtn && shopModal) {
        shopBtn.addEventListener('click', () => {
            shopModal.classList.add('open');
            casino.playSound('click');
        });
    }

    if (closeShop && shopModal) {
        closeShop.addEventListener('click', () => {
            shopModal.classList.remove('open');
            casino.playSound('click');
        });
    }

    // Reclamar Bono Diario
    const dailyBonusBtn = document.getElementById('claimDailyBonusBtn');
    if (dailyBonusBtn) {
        dailyBonusBtn.addEventListener('click', async () => {
            if (isProcessingClaim) return;
            isProcessingClaim = true;
            dailyBonusBtn.disabled = true;

            const res = await casino.claimDailyBonus();
            if (res.success) {
                updateUserUI();
                casino.playSound('jackpot');
                casino.showToast('Bono diario acreditado. Sumaste 2.000 créditos a tu cuenta.', 'win');
            } else {
                casino.showToast(res.error || 'No se pudo reclamar el bono.', 'error');
                casino.playSound('lose');
            }

            setTimeout(() => {
                isProcessingClaim = false;
                dailyBonusBtn.disabled = false;
            }, 600);
        });
    }

    // Canje de Monedas VIP
    const exchangeCoinsBtn = document.getElementById('exchangeCoinsBtn');
    if (exchangeCoinsBtn) {
        exchangeCoinsBtn.addEventListener('click', async () => {
            if (isProcessingExchange) return;
            isProcessingExchange = true;
            exchangeCoinsBtn.disabled = true;

            const res = await casino.exchangeCoins();
            if (res.success) {
                updateUserUI();
                casino.playSound('win');
                casino.showToast('Canjeaste 50 fichas VIP por 1.000 créditos.', 'win');
            } else {
                casino.showToast(res.error || 'Error al canjear fichas.', 'error');
                casino.playSound('lose');
            }

            setTimeout(() => {
                isProcessingExchange = false;
                exchangeCoinsBtn.disabled = false;
            }, 500);
        });
    }

    // Compra de Avatares VIP
    document.querySelectorAll('.buy-avatar-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (isProcessingAvatar) return;
            isProcessingAvatar = true;
            btn.disabled = true;

            const avatarKey = btn.dataset.avatar;
            const res = await casino.buyAvatar(avatarKey, AVATAR_CATALOG);

            if (res.success) {
                updateUserUI();
                casino.playSound('win');
                casino.showToast(`Compraste el avatar ${res.name || ''}.`, 'win');
            } else {
                casino.showToast(res.error || 'Error al comprar avatar.', 'error');
                casino.playSound('lose');
            }

            setTimeout(() => {
                isProcessingAvatar = false;
                btn.disabled = false;
            }, 500);
        });
    });
}

// Notificaciones
function setupNotificationListeners() {
    const notifBtn = document.getElementById('notificationBell');
    const notifModal = document.getElementById('notificationsModal');
    const closeNotif = document.getElementById('closeNotifications');

    if (notifBtn && notifModal) {
        notifBtn.addEventListener('click', () => {
            notifModal.classList.add('open');
            document.getElementById('notificationDot')?.style.setProperty('display', 'none');
            casino.playSound('click');
        });
    }

    if (closeNotif && notifModal) {
        closeNotif.addEventListener('click', () => {
            notifModal.classList.remove('open');
            casino.playSound('click');
        });
    }
}
