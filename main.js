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

// Centro de Avisos y Comunicados Oficiales (Panel de Administración)
function setupNotificationListeners() {
    const notifBtn = document.getElementById('notificationBell');
    const notifModal = document.getElementById('notificationsModal');
    const closeNotif = document.getElementById('closeNotifications');
    const notifDot = document.getElementById('notificationDot');

    const adminToggleBtn = document.getElementById('adminNoticeToggleBtn');
    const pinBox = document.getElementById('adminNoticePinBox');
    const composerBox = document.getElementById('adminNoticeComposerBox');
    const pinInput = document.getElementById('adminNoticePinInput');
    const submitPinBtn = document.getElementById('submitAdminPinBtn');
    const cancelPinBtn = document.getElementById('cancelAdminPinBtn');
    const pinError = document.getElementById('adminPinError');

    const titleInput = document.getElementById('newNoticeTitle');
    const badgeSelect = document.getElementById('newNoticeBadge');
    const authorInput = document.getElementById('newNoticeAuthor');
    const contentInput = document.getElementById('newNoticeContent');
    const publishBtn = document.getElementById('publishNoticeBtn');
    const exitAdminBtn = document.getElementById('exitAdminNoticeBtn');
    const feedContainer = document.getElementById('announcementsFeed');

    // Estado de sesión de administración
    let isAdminNoticeMode = sessionStorage.getItem('casino_admin_notice_mode') === 'true';

    function checkAdminAutoLogin() {
        const u = casino.getCurrentUser();
        if (u && (u.username === 'admin' || (u.email && u.email.startsWith('admin@')))) {
            isAdminNoticeMode = true;
            sessionStorage.setItem('casino_admin_notice_mode', 'true');
        }
    }

    function updateAdminUIState() {
        if (isAdminNoticeMode) {
            if (pinBox) pinBox.style.display = 'none';
            if (composerBox) composerBox.style.display = 'block';
            if (adminToggleBtn) {
                adminToggleBtn.innerHTML = '<i class="fas fa-edit"></i> Redactar Aviso';
                adminToggleBtn.style.borderColor = 'var(--gold)';
                adminToggleBtn.style.color = 'var(--gold)';
            }
            checkTableWarning();
        } else {
            if (composerBox) composerBox.style.display = 'none';
            const warningBanner = document.getElementById('adminSupabaseNoticeBanner');
            if (warningBanner) warningBanner.style.display = 'none';
            if (adminToggleBtn) {
                adminToggleBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Panel Admin';
                adminToggleBtn.style.borderColor = '';
                adminToggleBtn.style.color = '';
            }
        }
    }

    function formatNoticeDate(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 2) return 'Hace un momento';
            if (diffMins < 60) return `Hace ${diffMins} minutos`;
            if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
            if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;

            return date.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return '';
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function renderAnnouncements() {
        if (!feedContainer) return;

        const notices = await casino.getAnnouncements();

        // Control del punto de notificación
        if (casino.hasUnreadAnnouncements(notices)) {
            if (notifDot) notifDot.style.display = 'inline-block';
        } else {
            if (notifDot) notifDot.style.display = 'none';
        }

        if (!notices || notices.length === 0) {
            feedContainer.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                    <i class="fas fa-bullhorn" style="font-size: 2rem; color: rgba(255,255,255,0.15); margin-bottom: 12px; display: block;"></i>
                    No hay comunicados oficiales en este momento.
                </div>
            `;
            return;
        }

        feedContainer.innerHTML = notices.map(item => {
            const badgeClass = item.badge ? `badge-${item.badge.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}` : '';
            const safeTitle = escapeHtml(item.title);
            const safeContent = escapeHtml(item.content);
            const safeAuthor = escapeHtml(item.author || 'Administración');
            const safeBadge = escapeHtml(item.badge || 'Novedad');
            const formattedDate = formatNoticeDate(item.created_at);

            const deleteBtnHtml = isAdminNoticeMode ? `
                <button class="casino-nav-btn delete-notice-btn" data-id="${item.id}" style="padding: 4px 10px; font-size: 11px; color: #ff4757; border-color: rgba(255, 71, 87, 0.3);">
                    <i class="fas fa-trash-alt"></i> Eliminar
                </button>
            ` : '';

            return `
                <div class="notice-card ${badgeClass}">
                    <div class="notice-header">
                        <h4 class="notice-title">${safeTitle}</h4>
                        <span class="notice-badge ${badgeClass}">${safeBadge}</span>
                    </div>
                    <div class="notice-content">${safeContent}</div>
                    <div class="notice-footer">
                        <div class="notice-meta">
                            <span><i class="fas fa-user-shield" style="color: var(--gold); margin-right: 4px;"></i> ${safeAuthor}</span>
                            <span><i class="far fa-clock" style="margin-right: 4px;"></i> ${formattedDate}</span>
                        </div>
                        ${deleteBtnHtml}
                    </div>
                </div>
            `;
        }).join('');

        // Event listeners para eliminar avisos
        feedContainer.querySelectorAll('.delete-notice-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (!id) return;

                if (confirm('¿Deseas eliminar este comunicado?')) {
                    btn.disabled = true;
                    const res = await casino.deleteAnnouncement(id);
                    if (res.success) {
                        casino.playSound('click');
                        casino.showToast('Comunicado eliminado.', 'info');
                        await renderAnnouncements();
                    } else {
                        casino.showToast('No se pudo eliminar el comunicado.', 'error');
                        btn.disabled = false;
                    }
                }
            });
        });
    }

    // Inicializar estado y lista de avisos
    checkAdminAutoLogin();
    updateAdminUIState();
    renderAnnouncements();

    // Abrir Modal
    if (notifBtn && notifModal) {
        notifBtn.addEventListener('click', async () => {
            checkAdminAutoLogin();
            updateAdminUIState();
            notifModal.classList.add('open');
            casino.playSound('click');

            const notices = await casino.getAnnouncements();
            casino.markAnnouncementsAsRead(notices);
            if (notifDot) notifDot.style.display = 'none';
            await renderAnnouncements();
        });
    }

    // Cerrar Modal
    if (closeNotif && notifModal) {
        closeNotif.addEventListener('click', () => {
            notifModal.classList.remove('open');
            if (pinBox) pinBox.style.display = 'none';
            casino.playSound('click');
        });
    }

    // Botón Panel Admin en cabecera del modal
    if (adminToggleBtn) {
        adminToggleBtn.addEventListener('click', () => {
            checkAdminAutoLogin();
            if (isAdminNoticeMode) {
                // Alternar vista del compositor
                if (composerBox) {
                    composerBox.style.display = composerBox.style.display === 'none' ? 'block' : 'none';
                }
            } else {
                // Mostrar formulario de PIN
                if (pinBox) {
                    const isVisible = pinBox.style.display === 'block';
                    pinBox.style.display = isVisible ? 'none' : 'block';
                    if (!isVisible && pinInput) {
                        pinInput.value = '';
                        if (pinError) pinError.style.display = 'none';
                        setTimeout(() => pinInput.focus(), 100);
                    }
                }
            }
            casino.playSound('click');
        });
    }

    // Cancelar ingreso de PIN
    if (cancelPinBtn && pinBox) {
        cancelPinBtn.addEventListener('click', () => {
            pinBox.style.display = 'none';
            if (pinError) pinError.style.display = 'none';
            casino.playSound('click');
        });
    }

    // Validar PIN de Administrador
    async function handlePinSubmit() {
        if (!pinInput) return;
        const val = pinInput.value.trim();

        // Claves maestras aceptadas
        const validPins = ['admin777', 'casino777', '1234'];

        if (validPins.includes(val.toLowerCase())) {
            isAdminNoticeMode = true;
            sessionStorage.setItem('casino_admin_notice_mode', 'true');
            if (pinBox) pinBox.style.display = 'none';
            if (pinError) pinError.style.display = 'none';
            updateAdminUIState();
            await renderAnnouncements();
            casino.playSound('win');
            casino.showToast('Acceso de Administrador concedido. Ya puedes publicar y gestionar avisos.', 'win');
        } else {
            if (pinError) {
                pinError.innerText = 'Clave incorrecta. Inténtalo de nuevo.';
                pinError.style.display = 'block';
            }
            casino.playSound('lose');
        }
    }

    if (submitPinBtn) {
        submitPinBtn.addEventListener('click', handlePinSubmit);
    }
    if (pinInput) {
        pinInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handlePinSubmit();
        });
    }

    // Salir del Modo Administrador
    if (exitAdminBtn) {
        exitAdminBtn.addEventListener('click', async () => {
            isAdminNoticeMode = false;
            sessionStorage.removeItem('casino_admin_notice_mode');
            updateAdminUIState();
            await renderAnnouncements();
            casino.playSound('click');
            casino.showToast('Sesión de administrador cerrada.', 'info');
        });
    }

    async function checkTableWarning() {
        const warningBanner = document.getElementById('adminSupabaseNoticeBanner');
        if (!warningBanner) return;
        if (!isAdminNoticeMode) {
            warningBanner.style.display = 'none';
            return;
        }
        const status = await casino.checkAnnouncementsTableStatus();
        if (status.missingTable) {
            warningBanner.style.display = 'block';
        } else {
            warningBanner.style.display = 'none';
        }
    }

    const copySqlBtn = document.getElementById('copyAnnouncementsSqlBtn');
    if (copySqlBtn) {
        copySqlBtn.addEventListener('click', () => {
            const sql = `create table if not exists public.announcements (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    content text not null,
    author text not null default 'Administración',
    badge text not null default 'Novedad',
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop policy if exists "Lectura pública de avisos" on public.announcements;
create policy "Lectura pública de avisos" on public.announcements for select using (is_active = true);

drop policy if exists "Crear avisos" on public.announcements;
create policy "Crear avisos" on public.announcements for insert with check (true);

drop policy if exists "Modificar avisos" on public.announcements;
create policy "Modificar avisos" on public.announcements for update using (true);

drop policy if exists "Eliminar avisos" on public.announcements;
create policy "Eliminar avisos" on public.announcements for delete using (true);

alter publication supabase_realtime add table public.announcements;`;

            navigator.clipboard.writeText(sql).then(() => {
                copySqlBtn.innerHTML = '<i class="fas fa-check"></i> Código SQL Copiado';
                casino.showToast('Código SQL copiado al portapapeles. Pégalo en SQL Editor en Supabase y presiona Run.', 'win', 5000);
                setTimeout(() => {
                    copySqlBtn.innerHTML = '<i class="fas fa-copy"></i> Copiar Código SQL de Supabase';
                }, 3000);
            }).catch(() => {
                casino.showToast('No se pudo copiar automáticamente. Copia el archivo scripts/supabase-announcements.sql.', 'error');
            });
        });
    }

    // Publicar Comunicado
    if (publishBtn) {
        let isPublishing = false;
        publishBtn.addEventListener('click', async () => {
            if (isPublishing) return;

            const title = titleInput?.value.trim();
            const badge = badgeSelect?.value || 'Novedad';
            const author = authorInput?.value.trim() || 'Administración';
            const content = contentInput?.value.trim();

            if (!title) {
                casino.showToast('Escribe un título para el comunicado.', 'error');
                titleInput?.focus();
                casino.playSound('lose');
                return;
            }

            if (!content) {
                casino.showToast('Escribe el contenido del mensaje.', 'error');
                contentInput?.focus();
                casino.playSound('lose');
                return;
            }

            isPublishing = true;
            publishBtn.disabled = true;
            publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando...';

            const res = await casino.createAnnouncement({ title, content, author, badge });

            isPublishing = false;
            publishBtn.disabled = false;
            publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publicar Comunicado';

            if (res.success) {
                if (titleInput) titleInput.value = '';
                if (contentInput) contentInput.value = '';
                casino.playSound('jackpot');

                if (res.isLocal) {
                    casino.showToast('Aviso guardado solo en este navegador. Falta crear la tabla en Supabase.', 'error', 6000);
                    checkTableWarning();
                } else {
                    casino.showToast('Comunicado oficial publicado y transmitido en vivo por Supabase.', 'win', 4000);
                }
                await renderAnnouncements();
            } else {
                casino.showToast(res.error || 'No se pudo publicar el comunicado.', 'error');
                casino.playSound('lose');
            }
        });
    }

    // Escuchar eventos en tiempo real desde Supabase y otras pestañas
    window.addEventListener('casino:announcement_changed', async () => {
        await renderAnnouncements();
    });

    window.addEventListener('storage', async (e) => {
        if (e.key === 'casino_announcements_cache') {
            await renderAnnouncements();
        }
    });
}
