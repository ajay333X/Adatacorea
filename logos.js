// ------------------- LOGO ICON (SIDEBAR + MOBILE) -------------------
export const LOGO_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 380">
    <defs>
        <linearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#3b82f6; stop-opacity:1" />
            <stop offset="50%" style="stop-color:#a855f7; stop-opacity:1" />
            <stop offset="100%" style="stop-color:#ec4899; stop-opacity:1" />
        </linearGradient>
    </defs>
    <g transform="translate(200, 190)">
        <g fill="none" stroke="url(#mainGradient)" stroke-width="25" opacity="1"> 
            <ellipse cx="0" cy="0" rx="70" ry="160" transform="rotate(30)" />
            <ellipse cx="0" cy="0" rx="70" ry="160" transform="rotate(90)" />
            <ellipse cx="0" cy="0" rx="70" ry="160" transform="rotate(150)" />
        </g>
        <g fill="url(#mainGradient)">
            <circle cx="0" cy="-160" r="28" /> 
            <circle cx="0" cy="160" r="28" />
            <circle cx="-139" cy="-80" r="28" /> 
            <circle cx="139" cy="-80" r="28" />
            <circle cx="-139" cy="80" r="28" /> 
            <circle cx="139" cy="80" r="28" />
        </g>
        <circle cx="0" cy="0" r="60" fill="none" stroke="#ec4899" stroke-width="15" />
    </g>
</svg>`;

// ------------------- FULL LOGO (LANDING + AUTH) -------------------
export const LOGO_FULL_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
    <defs>
        <linearGradient id="fullGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#3b82f6; stop-opacity:1" />
            <stop offset="50%" style="stop-color:#a855f7; stop-opacity:1" />
            <stop offset="100%" style="stop-color:#ec4899; stop-opacity:1" />
        </linearGradient>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
    </defs>

    <g transform="translate(200, 180)">
        <g fill="none" stroke="url(#fullGradient)" stroke-width="14" opacity="0.9">
            <ellipse cx="0" cy="0" rx="60" ry="140" transform="rotate(30)" />
            <ellipse cx="0" cy="0" rx="60" ry="140" transform="rotate(90)" />
            <ellipse cx="0" cy="0" rx="60" ry="140" transform="rotate(150)" />
        </g>
        <g fill="url(#fullGradient)">
            <circle cx="0" cy="-140" r="18" /> 
            <circle cx="0" cy="140" r="18" />
            <circle cx="-121" cy="-70" r="18" /> 
            <circle cx="121" cy="-70" r="18" />
            <circle cx="-121" cy="70" r="18" /> 
            <circle cx="121" cy="70" r="18" />
        </g>
    </g>

    <text x="200" y="440"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-weight="bold"
        font-size="80"
        letter-spacing="-2"
        fill="url(#fullGradient)"
        style="filter: url(#glow);">
        Adatacore
    </text>
</svg>`;
