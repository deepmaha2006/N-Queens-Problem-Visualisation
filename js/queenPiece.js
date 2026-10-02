/**
 * Realistic Chess Queen SVG Generator
 * Generates an intricately detailed, Staunton-style 3D-shaded vector Chess Queen
 * with metallic reflections, pearls, beveled rings, and interactive visual states.
 */

export function createQueenSVG(options = {}) {
    const {
        theme = 'platinum', // 'platinum', 'obsidian', 'gold'
        state = 'placed', // 'placed', 'testing', 'conflict', 'hint'
        id = `queen-${Math.random().toString(36).substr(2, 9)}`
    } = options;

    const gradients = {
        platinum: {
            metalStart: '#f8fafc',
            metalMid: '#cbd5e1',
            metalDeep: '#475569',
            metalDark: '#0f172a',
            highlight: '#ffffff',
            pearlStart: '#ffffff',
            pearlEnd: '#94a3b8',
            baseGlow: 'rgba(255, 255, 255, 0.3)'
        },
        obsidian: {
            metalStart: '#52525b',
            metalMid: '#27272a',
            metalDeep: '#18181b',
            metalDark: '#09090b',
            highlight: '#a1a1aa',
            pearlStart: '#f4f4f5',
            pearlEnd: '#71717a',
            baseGlow: 'rgba(255, 255, 255, 0.15)'
        },
        gold: {
            metalStart: '#ffe082',
            metalMid: '#ffb300',
            metalDeep: '#b27b00',
            metalDark: '#664600',
            highlight: '#ffffff',
            pearlStart: '#fffde7',
            pearlEnd: '#ffd54f',
            baseGlow: 'rgba(255, 193, 7, 0.45)'
        }
    };

    const g = gradients[theme] || gradients.platinum;

    return `
    <svg class="chess-queen-svg state-${state}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Chess Queen">
        <defs>
            <!-- 3D Cylindrical lighting for Queen Body -->
            <linearGradient id="${id}-body-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="${g.metalDark}" />
                <stop offset="18%" stop-color="${g.metalMid}" />
                <stop offset="38%" stop-color="${g.metalStart}" />
                <stop offset="52%" stop-color="${g.highlight}" stop-opacity="0.9" />
                <stop offset="70%" stop-color="${g.metalMid}" />
                <stop offset="90%" stop-color="${g.metalDeep}" />
                <stop offset="100%" stop-color="${g.metalDark}" />
            </linearGradient>

            <!-- Crown Ray Gradient -->
            <linearGradient id="${id}-crown-grad" x1="20%" y1="0%" x2="80%" y2="100%">
                <stop offset="0%" stop-color="${g.highlight}" stop-opacity="0.95" />
                <stop offset="40%" stop-color="${g.metalStart}" />
                <stop offset="75%" stop-color="${g.metalMid}" />
                <stop offset="100%" stop-color="${g.metalDark}" />
            </linearGradient>

            <!-- Pearl Sphere Radial Gradient -->
            <radialGradient id="${id}-pearl-grad" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="45%" stop-color="${g.pearlStart}" />
                <stop offset="85%" stop-color="${g.pearlEnd}" />
                <stop offset="100%" stop-color="${g.metalDeep}" />
            </radialGradient>

            <!-- Ambient Base Shadow -->
            <radialGradient id="${id}-shadow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="rgba(0,0,0,0.65)" />
                <stop offset="65%" stop-color="rgba(0,0,0,0.3)" />
                <stop offset="100%" stop-color="rgba(0,0,0,0)" />
            </radialGradient>

            <!-- Filter for Dramatic Glow in safe / conflict states -->
            <filter id="${id}-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>

        <!-- Shadow under base -->
        <ellipse cx="50" cy="94" rx="34" ry="5.5" fill="url(#${id}-shadow)" />

        <!-- Queen Base Pedestal (Tier 1: Wide Bottom) -->
        <path d="M 18,91 C 18,88 22,86 50,86 C 78,86 82,88 82,91 C 82,93 78,94 50,94 C 22,94 18,93 18,91 Z" 
              fill="url(#${id}-body-grad)" stroke="${g.metalDark}" stroke-width="0.75" />

        <!-- Base Pedestal (Tier 2: Stepped Bevel) -->
        <path d="M 22,86 C 22,83 26,82 50,82 C 74,82 78,83 78,86 C 78,88 74,89 50,89 C 26,89 22,88 22,86 Z" 
              fill="url(#${id}-body-grad)" stroke="${g.metalDark}" stroke-width="0.6" />

        <!-- Lower Skirt Ring -->
        <path d="M 27,82 C 27,78 30,76 50,76 C 70,76 73,78 73,82 C 73,83 70,84 50,84 C 30,84 27,83 27,82 Z" 
              fill="url(#${id}-body-grad)" stroke="${g.metalDark}" stroke-width="0.5" />

        <!-- Main Body / Waist Flaring Upward -->
        <path d="M 32,77 C 33,65 37,54 41,47 C 42,45 42,42 41,40 L 59,40 C 58,42 58,45 59,47 C 63,54 67,65 68,77 C 60,80 40,80 32,77 Z" 
              fill="url(#${id}-body-grad)" stroke="${g.metalDark}" stroke-width="0.75" />

        <!-- Mid-Waist Molded Ring / Collar -->
        <ellipse cx="50" cy="40" rx="14" ry="3.2" fill="url(#${id}-body-grad)" stroke="${g.metalDark}" stroke-width="0.6" />
        <ellipse cx="50" cy="38" rx="12" ry="2.8" fill="url(#${id}-crown-grad)" stroke="${g.metalDark}" stroke-width="0.5" />

        <!-- Crown Corbel / Chest Flare -->
        <path d="M 38,38 C 36,33 32,27 24,24 C 33,28 42,28 50,29 C 58,28 67,28 76,24 C 68,27 64,33 62,38 Z" 
              fill="url(#${id}-body-grad)" stroke="${g.metalDark}" stroke-width="0.6" />

        <!-- Crown Coronet Spikes (7 Royal Tines) -->
        <path d="M 24,24 
                 C 25,18 28,14 30,12 
                 L 35,22 
                 L 41,10 
                 L 46,21 
                 L 50,7 
                 L 54,21 
                 L 59,10 
                 L 65,22 
                 L 70,12 
                 C 72,14 75,18 76,24 
                 C 68,28 32,28 24,24 Z" 
              fill="url(#${id}-crown-grad)" stroke="${g.metalDark}" stroke-width="0.75" />

        <!-- Crown Filigree Rim -->
        <ellipse cx="50" cy="24.5" rx="25" ry="3.8" fill="none" stroke="${g.highlight}" stroke-opacity="0.8" stroke-width="0.7" />

        <!-- Pearls on the 7 Crown Spikes -->
        <circle cx="30" cy="12" r="2.8" fill="url(#${id}-pearl-grad)" stroke="${g.metalDark}" stroke-width="0.4" />
        <circle cx="41" cy="10" r="2.9" fill="url(#${id}-pearl-grad)" stroke="${g.metalDark}" stroke-width="0.4" />
        <circle cx="50" cy="7"  r="3.8" fill="url(#${id}-pearl-grad)" stroke="${g.metalDark}" stroke-width="0.5" />
        <circle cx="59" cy="10" r="2.9" fill="url(#${id}-pearl-grad)" stroke="${g.metalDark}" stroke-width="0.4" />
        <circle cx="70" cy="12" r="2.8" fill="url(#${id}-pearl-grad)" stroke="${g.metalDark}" stroke-width="0.4" />

        <!-- Master Top Pearl Cross / Finial on Central Spire -->
        <circle cx="50" cy="3.2" r="2.2" fill="url(#${id}-pearl-grad)" stroke="${g.metalDark}" stroke-width="0.4" />

        <!-- Royal Crown Jewel / Emerald/Ruby Centerpiece -->
        <ellipse cx="50" cy="33" rx="3.5" ry="4.5" fill="#00e676" opacity="0.9" />
        <ellipse cx="49" cy="32" rx="1.2" ry="1.8" fill="#ffffff" opacity="0.8" />
    </svg>`;
}
