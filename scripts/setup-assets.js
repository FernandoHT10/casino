/**
 * Script generador y descargador de assets vectoriales (SVG) para Casino AC.
 * Genera gráficos de alta definición con gradientes y sombras para todos los juegos y UI.
 */
const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'assets');

const directories = [
    'ui',
    'games/slots',
    'games/mines',
    'games/chicken',
    'games/thimbles',
    'games/maletero',
    'games/cards'
];

directories.forEach(dir => {
    fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
});

// Definiciones de SVGs de alta definición
const assets = {
    // UI
    'ui/coin.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="goldGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#fff8db"/>
      <stop offset="35%" stop-color="#ffd700"/>
      <stop offset="85%" stop-color="#d49b00"/>
      <stop offset="100%" stop-color="#8a5a00"/>
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <circle cx="50" cy="50" r="46" fill="url(#goldGrad)" filter="url(#glow)"/>
  <circle cx="50" cy="50" r="38" fill="none" stroke="#ffeaa7" stroke-width="2.5" stroke-dasharray="4 3"/>
  <circle cx="50" cy="50" r="33" fill="#e6a100"/>
  <text x="50" y="61" font-family="'Segoe UI', Arial, sans-serif" font-size="34" font-weight="900" fill="#fff" text-anchor="middle" filter="drop-shadow(0 2px 2px rgba(0,0,0,0.5))">$</text>
</svg>`,

    'ui/crown.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff6cc"/>
      <stop offset="50%" stop-color="#ffd700"/>
      <stop offset="100%" stop-color="#d48800"/>
    </linearGradient>
  </defs>
  <path d="M15 75 L20 35 L40 55 L50 25 L60 55 L80 35 L85 75 Z" fill="url(#crownGrad)" stroke="#b87400" stroke-width="2"/>
  <rect x="15" y="75" width="70" height="12" rx="4" fill="#d48800"/>
  <circle cx="20" cy="33" r="5" fill="#ff4757"/>
  <circle cx="50" cy="23" r="6" fill="#00f2fe"/>
  <circle cx="80" cy="33" r="5" fill="#2ed573"/>
  <circle cx="35" cy="81" r="3.5" fill="#fff"/>
  <circle cx="50" cy="81" r="3.5" fill="#ffd700"/>
  <circle cx="65" cy="81" r="3.5" fill="#fff"/>
</svg>`,

    // SLOTS
    'games/slots/seven.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="fireGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff176"/>
      <stop offset="40%" stop-color="#ff5722"/>
      <stop offset="100%" stop-color="#d50000"/>
    </linearGradient>
  </defs>
  <path d="M22 22 L78 22 L78 35 L48 82 L32 82 L58 35 L22 35 Z" fill="url(#fireGrad)" stroke="#ffd700" stroke-width="4" stroke-linejoin="round" filter="drop-shadow(0 6px 8px rgba(0,0,0,0.6))"/>
</svg>`,

    'games/slots/cherry.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="cherryRed" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#ff7675"/>
      <stop offset="60%" stop-color="#d63031"/>
      <stop offset="100%" stop-color="#630a0a"/>
    </radialGradient>
  </defs>
  <path d="M35 50 C 45 30, 60 20, 75 16 C 65 24, 60 35, 62 52" fill="none" stroke="#27ae60" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M60 22 C 70 12, 85 15, 88 20 C 85 28, 72 26, 60 22 Z" fill="#2ecc71"/>
  <circle cx="34" cy="62" r="18" fill="url(#cherryRed)" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"/>
  <circle cx="68" cy="65" r="18" fill="url(#cherryRed)" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"/>
</svg>`,

    'games/slots/bell.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff8db"/>
      <stop offset="50%" stop-color="#ffd700"/>
      <stop offset="100%" stop-color="#b8860b"/>
    </linearGradient>
  </defs>
  <path d="M50 16 C45 16 42 20 42 25 C30 30 25 45 23 64 L77 64 C75 45 70 30 58 25 C58 20 55 16 50 16 Z" fill="url(#bellGrad)" stroke="#805b00" stroke-width="2"/>
  <ellipse cx="50" cy="65" rx="30" ry="7" fill="#d49b00"/>
  <circle cx="50" cy="74" r="8" fill="#a06800"/>
</svg>`,

    'games/slots/diamond.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="gemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e0ffff"/>
      <stop offset="40%" stop-color="#00e5ff"/>
      <stop offset="100%" stop-color="#0091ea"/>
    </linearGradient>
  </defs>
  <polygon points="30,22 70,22 86,45 50,86 14,45" fill="url(#gemGrad)" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" filter="drop-shadow(0 6px 12px rgba(0,229,255,0.4))"/>
  <polygon points="30,22 50,45 70,22" fill="#80d8ff" opacity="0.7"/>
  <polygon points="14,45 50,45 30,22" fill="#b3e5fc" opacity="0.6"/>
  <polygon points="86,45 50,45 70,22" fill="#00b0ff" opacity="0.8"/>
  <polygon points="50,45 14,45 50,86" fill="#0091ea" opacity="0.7"/>
  <polygon points="50,45 86,45 50,86" fill="#01579b" opacity="0.85"/>
</svg>`,

    'games/slots/lemon.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="lemonGrad" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#ffff72"/>
      <stop offset="70%" stop-color="#ffea00"/>
      <stop offset="100%" stop-color="#c7a500"/>
    </radialGradient>
  </defs>
  <ellipse cx="50" cy="50" rx="38" ry="30" transform="rotate(-30 50 50)" fill="url(#lemonGrad)" stroke="#c7a500" stroke-width="2" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.4))"/>
  <path d="M22 68 C 16 65, 14 62, 17 56" fill="none" stroke="#c7a500" stroke-width="4" stroke-linecap="round"/>
  <path d="M78 32 C 84 35, 86 38, 83 44" fill="none" stroke="#c7a500" stroke-width="4" stroke-linecap="round"/>
</svg>`,

    'games/slots/moneybag.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bagGrad" cx="40%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#785c37"/>
      <stop offset="60%" stop-color="#543d22"/>
      <stop offset="100%" stop-color="#2d1f0f"/>
    </radialGradient>
  </defs>
  <path d="M40 32 L40 24 C40 20, 60 20, 60 24 L60 32" fill="#b8860b"/>
  <path d="M36 34 C30 38, 18 55, 18 70 C18 85, 30 88, 50 88 C70 88, 82 85, 82 70 C82 55, 70 38, 64 34 Z" fill="url(#bagGrad)" stroke="#ffd700" stroke-width="2.5" filter="drop-shadow(0 6px 10px rgba(0,0,0,0.6))"/>
  <circle cx="50" cy="62" r="16" fill="#ffd700"/>
  <text x="50" y="70" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#2d1f0f" text-anchor="middle">$</text>
</svg>`,

    // MINES
    'games/mines/crate.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="crateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3a4052"/>
      <stop offset="100%" stop-color="#1f232e"/>
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="80" height="80" rx="14" fill="url(#crateGrad)" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
  <line x1="10" y1="10" x2="90" y2="90" stroke="rgba(0,0,0,0.4)" stroke-width="3"/>
  <line x1="90" y1="10" x2="10" y2="90" stroke="rgba(0,0,0,0.4)" stroke-width="3"/>
  <circle cx="50" cy="50" r="14" fill="#2a2e3b" stroke="#ffd700" stroke-width="2"/>
  <circle cx="50" cy="50" r="5" fill="#ffd700"/>
</svg>`,

    'games/mines/mine.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="mineGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#4a4a4a"/>
      <stop offset="70%" stop-color="#1c1c1c"/>
      <stop offset="100%" stop-color="#050505"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="30" fill="url(#mineGrad)" stroke="#ff4757" stroke-width="2.5" filter="drop-shadow(0 0 10px rgba(255,71,87,0.6))"/>
  <!-- Spikes -->
  <line x1="50" y1="12" x2="50" y2="88" stroke="#333" stroke-width="6" stroke-linecap="round"/>
  <line x1="12" y1="50" x2="88" y2="50" stroke="#333" stroke-width="6" stroke-linecap="round"/>
  <line x1="23" y1="23" x2="77" y2="77" stroke="#333" stroke-width="6" stroke-linecap="round"/>
  <line x1="77" y1="23" x2="23" y2="77" stroke="#333" stroke-width="6" stroke-linecap="round"/>
  <circle cx="50" cy="50" r="28" fill="url(#mineGrad)"/>
  <circle cx="50" cy="50" r="8" fill="#ff4757">
    <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" repeatCount="indefinite"/>
  </circle>
</svg>`,

    'games/mines/gem.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="emerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a8ff78"/>
      <stop offset="50%" stop-color="#2ed573"/>
      <stop offset="100%" stop-color="#009432"/>
    </linearGradient>
  </defs>
  <polygon points="30,18 70,18 88,42 50,86 12,42" fill="url(#emerald)" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" filter="drop-shadow(0 0 15px rgba(46,213,115,0.7))"/>
  <polygon points="30,18 50,42 70,18" fill="#b8e994" opacity="0.6"/>
  <polygon points="12,42 50,42 30,18" fill="#dff9fb" opacity="0.6"/>
  <polygon points="88,42 50,42 70,18" fill="#009432" opacity="0.6"/>
  <polygon points="50,42 12,42 50,86" fill="#009432" opacity="0.5"/>
  <polygon points="50,42 88,42 50,86" fill="#006266" opacity="0.7"/>
</svg>`,

    // CHICKEN ROAD
    'games/chicken/chicken.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="chickenBody" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="80%" stop-color="#f1f2f6"/>
      <stop offset="100%" stop-color="#ced6e0"/>
    </radialGradient>
  </defs>
  <!-- Cuerpo ovalado cenital -->
  <ellipse cx="50" cy="56" rx="26" ry="30" fill="url(#chickenBody)" stroke="#a4b0be" stroke-width="2" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"/>
  <!-- Alas laterales -->
  <path d="M24 45 C 18 55, 18 68, 26 72" fill="none" stroke="#ced6e0" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M76 45 C 82 55, 82 68, 74 72" fill="none" stroke="#ced6e0" stroke-width="3.5" stroke-linecap="round"/>
  <!-- Cabeza hacia arriba -->
  <circle cx="50" cy="30" r="16" fill="url(#chickenBody)" stroke="#a4b0be" stroke-width="1.5"/>
  <!-- Cresta roja -->
  <path d="M46 16 C 48 8, 52 8, 54 16 C 58 10, 62 14, 58 20 L42 20 Z" fill="#ff4757"/>
  <!-- Pico amarillo -->
  <polygon points="46,24 54,24 50,14" fill="#ffa502"/>
  <!-- Ojos -->
  <circle cx="44" cy="27" r="2.5" fill="#2f3542"/>
  <circle cx="56" cy="27" r="2.5" fill="#2f3542"/>
</svg>`,

    'games/chicken/car_red.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60">
  <defs>
    <linearGradient id="redCar" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ff4757"/>
      <stop offset="50%" stop-color="#d63031"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </linearGradient>
  </defs>
  <!-- Ruedas -->
  <rect x="16" y="2" width="22" height="8" rx="3" fill="#111"/>
  <rect x="82" y="2" width="22" height="8" rx="3" fill="#111"/>
  <rect x="16" y="50" width="22" height="8" rx="3" fill="#111"/>
  <rect x="82" y="50" width="22" height="8" rx="3" fill="#111"/>
  <!-- Chasis -->
  <rect x="6" y="8" width="108" height="44" rx="10" fill="url(#redCar)" stroke="#ff6b81" stroke-width="1.5" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.6))"/>
  <!-- Parabrisas delantero (mira a la derecha) -->
  <path d="M80 14 L94 20 L94 40 L80 46 Z" fill="#74b9ff" opacity="0.85"/>
  <!-- Ventanillas y techo -->
  <rect x="36" y="15" width="40" height="30" rx="4" fill="#2d3436" opacity="0.8"/>
  <path d="M32 14 L24 18 L24 42 L32 46 Z" fill="#74b9ff" opacity="0.7"/>
  <!-- Faros delanteros -->
  <circle cx="110" cy="14" r="3.5" fill="#fff" filter="drop-shadow(2px 0 4px #ffd700)"/>
  <circle cx="110" cy="46" r="3.5" fill="#fff" filter="drop-shadow(2px 0 4px #ffd700)"/>
</svg>`,

    'games/chicken/car_blue.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60">
  <defs>
    <linearGradient id="blueCar" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00d2d3"/>
      <stop offset="50%" stop-color="#0984e3"/>
      <stop offset="100%" stop-color="#0a3d62"/>
    </linearGradient>
  </defs>
  <rect x="16" y="2" width="22" height="8" rx="3" fill="#111"/>
  <rect x="82" y="2" width="22" height="8" rx="3" fill="#111"/>
  <rect x="16" y="50" width="22" height="8" rx="3" fill="#111"/>
  <rect x="82" y="50" width="22" height="8" rx="3" fill="#111"/>
  <rect x="6" y="8" width="108" height="44" rx="10" fill="url(#blueCar)" stroke="#74b9ff" stroke-width="1.5" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.6))"/>
  <path d="M80 14 L94 20 L94 40 L80 46 Z" fill="#dfe6e9" opacity="0.85"/>
  <rect x="36" y="15" width="40" height="30" rx="4" fill="#2d3436" opacity="0.8"/>
  <path d="M32 14 L24 18 L24 42 L32 46 Z" fill="#dfe6e9" opacity="0.7"/>
  <circle cx="110" cy="14" r="3.5" fill="#fff" filter="drop-shadow(2px 0 4px #fff)"/>
  <circle cx="110" cy="46" r="3.5" fill="#fff" filter="drop-shadow(2px 0 4px #fff)"/>
</svg>`,

    'games/chicken/truck.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 64">
  <defs>
    <linearGradient id="truckGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f39c12"/>
      <stop offset="50%" stop-color="#d35400"/>
      <stop offset="100%" stop-color="#7e3200"/>
    </linearGradient>
  </defs>
  <rect x="12" y="2" width="24" height="8" rx="3" fill="#111"/>
  <rect x="42" y="2" width="24" height="8" rx="3" fill="#111"/>
  <rect x="100" y="2" width="24" height="8" rx="3" fill="#111"/>
  <rect x="12" y="54" width="24" height="8" rx="3" fill="#111"/>
  <rect x="42" y="54" width="24" height="8" rx="3" fill="#111"/>
  <rect x="100" y="54" width="24" height="8" rx="3" fill="#111"/>
  <!-- Contenedor trasero -->
  <rect x="6" y="8" width="80" height="48" rx="4" fill="#7f8c8d" stroke="#bdc3c7" stroke-width="1.5"/>
  <!-- Cabina -->
  <rect x="88" y="9" width="46" height="46" rx="8" fill="url(#truckGrad)" stroke="#f39c12" stroke-width="1.5"/>
  <path d="M106 14 L126 18 L126 46 L106 50 Z" fill="#ecf0f1" opacity="0.8"/>
  <circle cx="132" cy="14" r="4" fill="#fff"/>
  <circle cx="132" cy="50" r="4" fill="#fff"/>
</svg>`,

    // THIMBLES
    'games/thimbles/goblet.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 130">
  <defs>
    <linearGradient id="goldGoblet" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff4b8"/>
      <stop offset="35%" stop-color="#f5cd2f"/>
      <stop offset="70%" stop-color="#b8860b"/>
      <stop offset="100%" stop-color="#543d00"/>
    </linearGradient>
  </defs>
  <!-- Vaso / Cubilete invertido -->
  <path d="M22 115 L14 30 C14 20, 30 14, 50 14 C70 14, 86 20, 86 30 L78 115 Z" fill="url(#goldGoblet)" stroke="#805b00" stroke-width="2" filter="drop-shadow(0 10px 15px rgba(0,0,0,0.6))"/>
  <ellipse cx="50" cy="115" rx="28" ry="7" fill="#b8860b" stroke="#543d00" stroke-width="2"/>
  <ellipse cx="50" cy="24" rx="32" ry="7" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.6"/>
  <!-- Grabado ornamental central -->
  <circle cx="50" cy="65" r="14" fill="#805b00" opacity="0.5"/>
  <polygon points="50,55 54,63 62,63 56,68 58,76 50,71 42,76 44,68 38,63 46,63" fill="#ffd700"/>
</svg>`,

    'games/thimbles/golden_ball.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="sphereGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#ffd700"/>
      <stop offset="80%" stop-color="#b8860b"/>
      <stop offset="100%" stop-color="#543d00"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="50" r="45" fill="url(#sphereGrad)" filter="drop-shadow(0 6px 12px rgba(0,0,0,0.6))"/>
  <ellipse cx="40" cy="35" rx="18" ry="12" fill="#fff" opacity="0.6"/>
</svg>`,

    // MALETERO
    'games/maletero/briefcase_closed.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100">
  <defs>
    <linearGradient id="caseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3d4455"/>
      <stop offset="50%" stop-color="#222733"/>
      <stop offset="100%" stop-color="#12151c"/>
    </linearGradient>
  </defs>
  <!-- Asa superior -->
  <path d="M46 22 L46 12 C46 8, 74 8, 74 12 L74 22" fill="none" stroke="#ffd700" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Cuerpo maletín -->
  <rect x="12" y="22" width="96" height="66" rx="8" fill="url(#caseGrad)" stroke="#ffd700" stroke-width="2.5" filter="drop-shadow(0 10px 15px rgba(0,0,0,0.6))"/>
  <!-- Refuerzos de esquinas doradas -->
  <path d="M12 34 L24 22 L12 22 Z" fill="#ffd700"/>
  <path d="M108 34 L96 22 L108 22 Z" fill="#ffd700"/>
  <path d="M12 76 L24 88 L12 88 Z" fill="#ffd700"/>
  <path d="M108 76 L96 88 L108 88 Z" fill="#ffd700"/>
  <!-- Cerraduras gemelas -->
  <rect x="36" y="44" width="10" height="14" rx="2" fill="#ffd700"/>
  <rect x="74" y="44" width="10" height="14" rx="2" fill="#ffd700"/>
  <line x1="12" y1="52" x2="108" y2="52" stroke="#ffd700" stroke-width="2"/>
</svg>`,

    'games/maletero/briefcase_cash.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100">
  <defs>
    <linearGradient id="cashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2ed573"/>
      <stop offset="100%" stop-color="#1e824c"/>
    </linearGradient>
  </defs>
  <!-- Base maletín abierto -->
  <rect x="12" y="32" width="96" height="56" rx="8" fill="#1a1e28" stroke="#ffd700" stroke-width="2.5"/>
  <!-- Fajos de billetes verdes desbordantes -->
  <rect x="22" y="36" width="35" height="24" rx="3" fill="url(#cashGrad)" stroke="#fff" stroke-width="1"/>
  <rect x="62" y="36" width="35" height="24" rx="3" fill="url(#cashGrad)" stroke="#fff" stroke-width="1"/>
  <rect x="42" y="24" width="36" height="26" rx="3" fill="url(#cashGrad)" stroke="#fff" stroke-width="1.5" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"/>
  <text x="60" y="42" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="#fff" text-anchor="middle">$$$</text>
</svg>`,

    // CARDS
    'games/cards/spade.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 12 C30 38, 14 52, 14 68 C14 80, 26 88, 38 88 C44 88, 48 84, 50 80 C52 84, 56 88, 62 88 C74 88, 86 80, 86 68 C86 52, 70 38, 50 12 Z" fill="#1e272e"/><path d="M46 76 L38 94 L62 94 L54 76 Z" fill="#1e272e"/></svg>`,
    'games/cards/heart.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 86 C20 62, 12 45, 12 30 C12 16, 24 10, 36 10 C44 10, 48 14, 50 18 C52 14, 56 10, 64 10 C76 10, 88 16, 88 30 C88 45, 80 62, 50 86 Z" fill="#d63031"/></svg>`,
    'games/cards/diamond.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,8 86,50 50,92 14,50" fill="#d63031"/></svg>`,
    'games/cards/club.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="30" r="20" fill="#1e272e"/><circle cx="30" cy="58" r="20" fill="#1e272e"/><circle cx="70" cy="58" r="20" fill="#1e272e"/><path d="M46 54 L38 94 L62 94 L54 54 Z" fill="#1e272e"/></svg>`
};

let count = 0;
for (const [fileRel, svgContent] of Object.entries(assets)) {
    const fullPath = path.join(baseDir, fileRel);
    fs.writeFileSync(fullPath, svgContent.trim(), 'utf8');
    count++;
}

console.log(`Generados con éxito ${count} assets vectoriales SVG en /casino/assets/`);
