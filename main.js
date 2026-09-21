/**
 * Casino AC - Main Lobby Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    checkSession();
    setupAuthListeners();
    setupShopListeners();
    setupNotificationListeners();
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

// Comprobar Sesión
function checkSession() {
    const user = casino.getCurrentUser();
    const loginSection = document.getElementById('authSection');
    const menuSection = document.getElementById('menuSection');

    if (user && casino.currentUser) {
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

    if (usernameEl) usernameEl.innerText = casino.currentUser;
    if (saldoEl) saldoEl.innerText = Math.floor(user.saldo).toLocaleString();
    if (levelEl) levelEl.innerText = user.level || 1;
    if (xpEl) xpEl.innerText = user.xp || 0;
    if (coinsEl) coinsEl.innerText = user.coins || 0;
    if (avatarEl) avatarEl.innerText = user.avatar || '👤';
}

// Autenticación (Login / Registro / Logout)
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

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const u = document.getElementById('username').value.trim();
            const p = document.getElementById('password').value.trim();

            if (!u || !p) {
                setAuthMsg('Por favor completa todos los campos.');
                casino.playSound('lose');
                return;
            }

            const users = JSON.parse(localStorage.getItem('users')) || {};
            if (users[u] && users[u].password === p) {
                casino.currentUser = u;
                localStorage.setItem('currentUser', u);
                casino.initUsers();
                casino.playSound('win');
                setAuthMsg('¡Bienvenido de vuelta! 🎉', 'success');
                setTimeout(() => checkSession(), 600);
            } else {
                setAuthMsg('Usuario o contraseña incorrectos.');
                casino.playSound('lose');
            }
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
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

            const users = JSON.parse(localStorage.getItem('users')) || {};
            if (users[u]) {
                setAuthMsg('Ese nombre de usuario ya existe.');
                casino.playSound('lose');
                return;
            }

            // Nuevo Usuario con bono de bienvenida
            users[u] = {
                password: p,
                saldo: 10000,
                level: 1,
                xp: 0,
                coins: 100,
                avatar: '👤',
                lastBonus: null,
                joined: new Date().toISOString()
            };

            localStorage.setItem('users', JSON.stringify(users));
            casino.currentUser = u;
            localStorage.setItem('currentUser', u);
            casino.initUsers();
            casino.playSound('jackpot');
            setAuthMsg('¡Cuenta creada con éxito! +10,000 créditos de bono.', 'success');
            setTimeout(() => checkSession(), 800);
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            casino.currentUser = null;
            localStorage.removeItem('currentUser');
            casino.playSound('click');
            checkSession();
        });
    }
}

// Tienda Funcional
function setupShopListeners() {
    const shopBtn = document.getElementById('shopBtn');
    const shopModal = document.getElementById('shopModal');
    const closeShop = document.getElementById('closeShopBtn');

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

    // Bono Diario
    const dailyBonusBtn = document.getElementById('claimDailyBonusBtn');
    if (dailyBonusBtn) {
        dailyBonusBtn.addEventListener('click', () => {
            const user = casino.getCurrentUser();
            if (!user) return;

            const now = Date.now();
            const last = user.lastBonus || 0;
            const cooldown = 24 * 60 * 60 * 1000; // 24 horas

            if (now - last < cooldown) {
                const hoursLeft = Math.ceil((cooldown - (now - last)) / (1000 * 60 * 60));
                casino.showToast(`Bono diario ya reclamado. Vuelve en ${hoursLeft}h.`, 'error');
                casino.playSound('lose');
                return;
            }

            user.saldo += 2000;
            user.lastBonus = now;
            casino.saveUsers();
            updateUserUI();
            casino.playSound('jackpot');
            casino.showToast('¡Has reclamado tu bono diario de 2,000 créditos! 🎁', 'win');
        });
    }

    // Canje de Monedas
    const exchangeCoinsBtn = document.getElementById('exchangeCoinsBtn');
    if (exchangeCoinsBtn) {
        exchangeCoinsBtn.addEventListener('click', () => {
            const user = casino.getCurrentUser();
            if (!user) return;

            if ((user.coins || 0) < 50) {
                casino.showToast('Necesitas al menos 50 fichas para canjear.', 'error');
                casino.playSound('lose');
                return;
            }

            user.coins -= 50;
            user.saldo += 1000;
            casino.saveUsers();
            updateUserUI();
            casino.playSound('win');
            casino.showToast('¡Canjeaste 50 fichas por 1,000 créditos!', 'win');
        });
    }

    // Compra de Avatares
    document.querySelectorAll('.buy-avatar-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const user = casino.getCurrentUser();
            if (!user) return;

            const price = parseInt(btn.dataset.price);
            const avatar = btn.dataset.avatar;

            if (user.saldo < price) {
                casino.showToast('Saldo insuficiente para comprar este avatar.', 'error');
                casino.playSound('lose');
                return;
            }

            user.saldo -= price;
            user.avatar = avatar;
            casino.saveUsers();
            updateUserUI();
            casino.playSound('win');
            casino.showToast(`¡Nuevo avatar equipado: ${avatar}!`, 'win');
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
