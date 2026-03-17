/* All custom SVG icons from knockbet.jsx design */

export function LogoBolt() {
  return (
    <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
      <polygon points="9,1 3,11 8,11 5,19 13,8 8,8 11,1"
        fill="#fbbf24" stroke="#fde047" strokeWidth=".5" />
    </svg>
  );
}

export function LightningIcon({ size = 90 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 100" fill="none">
      <defs>
        <linearGradient id="bolt" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e879f9" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <filter id="boltGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <polygon points="44,4 18,52 36,52 24,96 62,40 42,40 56,4" fill="#c084fc" opacity=".25" filter="url(#boltGlow)" />
      <polygon points="44,4 18,52 36,52 24,96 62,40 42,40 56,4"
        fill="url(#bolt)" stroke="#e879f9" strokeWidth="1.5" filter="url(#boltGlow)" />
    </svg>
  );
}

export function ChatBubbleIcon({ size = 100 }) {
  return (
    <svg width={size} height={size * 0.88} viewBox="0 0 120 106" fill="none">
      <defs>
        <radialGradient id="bubbleGrad" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
        <filter id="bubbleGlow">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <ellipse cx="60" cy="52" rx="52" ry="44" fill="#7c3aed" opacity=".3" filter="url(#bubbleGlow)" />
      <path d="M10 42 Q10 10 60 10 Q110 10 110 42 Q110 74 60 74 L44 94 L48 74 Q10 74 10 42Z"
        fill="url(#bubbleGrad)" opacity=".92" />
      <circle cx="38" cy="42" r="6" fill="white" opacity=".95" />
      <circle cx="60" cy="42" r="6" fill="white" opacity=".95" />
      <circle cx="82" cy="42" r="6" fill="white" opacity=".95" />
    </svg>
  );
}

export function FlameIcon({ size = 90 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 100" fill="none">
      <defs>
        <radialGradient id="flameOut" cx="50%" cy="80%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="40%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#dc2626" />
        </radialGradient>
        <radialGradient id="flameIn" cx="50%" cy="70%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="60%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f97316" />
        </radialGradient>
        <filter id="flameGlow">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d="M40 95 C15 85 8 68 12 52 C16 36 24 30 28 20 C30 28 28 35 32 40 C34 28 40 18 46 8 C50 22 48 36 54 44 C58 34 56 22 60 14 C68 28 72 46 68 62 C64 78 55 90 40 95Z"
        fill="url(#flameOut)" filter="url(#flameGlow)" />
      <path d="M40 88 C26 80 22 68 26 56 C30 46 34 42 36 36 C38 44 36 50 40 56 C42 46 46 38 50 32 C54 42 52 56 56 64 C58 56 56 46 58 40 C64 52 66 66 58 78 C52 88 46 92 40 88Z"
        fill="url(#flameIn)" opacity=".9" />
    </svg>
  );
}

export function RocketIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="rktBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" /><stop offset="100%" stopColor="#be185d" />
        </linearGradient>
        <filter id="rktGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse cx="32" cy="32" rx="20" ry="24" fill="url(#rktBody)" opacity=".8" filter="url(#rktGlow)"/>
      <ellipse cx="32" cy="18" rx="10" ry="14" fill="#fda4af" opacity=".9"/>
      <path d="M16 44 L8 56 L20 50Z" fill="#f472b6" opacity=".7"/>
      <path d="M48 44 L56 56 L44 50Z" fill="#f472b6" opacity=".7"/>
      <ellipse cx="32" cy="52" rx="6" ry="4" fill="#fb923c" opacity=".8"/>
      <circle cx="32" cy="30" r="5" fill="white" opacity=".3"/>
    </svg>
  );
}

export function BoxIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="boxG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8"/><stop offset="100%" stopColor="#475569"/>
        </linearGradient>
      </defs>
      <rect x="12" y="22" width="40" height="32" rx="4" fill="url(#boxG)" opacity=".85"/>
      <polygon points="12,22 32,14 52,22 32,30" fill="#cbd5e1" opacity=".9"/>
      <line x1="32" y1="30" x2="32" y2="54" stroke="#94a3b8" strokeWidth="1.5"/>
      <line x1="22" y1="18" x2="22" y2="26" stroke="#cbd5e1" strokeWidth="2"/>
      <line x1="42" y1="18" x2="42" y2="26" stroke="#cbd5e1" strokeWidth="2"/>
    </svg>
  );
}

export function BoltStatIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="boltStat" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9"/><stop offset="100%" stopColor="#0284c7"/>
        </linearGradient>
        <filter id="boltStatGlow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <polygon points="36,6 18,36 30,36 22,58 46,28 34,28 42,6"
        fill="url(#boltStat)" filter="url(#boltStatGlow)" opacity=".95"/>
    </svg>
  );
}

export function PeopleIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="pplG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#0ea5e9"/>
        </linearGradient>
        <filter id="pplGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx="22" cy="22" r="9" fill="url(#pplG)" opacity=".7" filter="url(#pplGlow)"/>
      <path d="M6 52 Q6 36 22 36 Q30 36 34 42" fill="url(#pplG)" opacity=".65"/>
      <circle cx="42" cy="20" r="9" fill="url(#pplG)" opacity=".85" filter="url(#pplGlow)"/>
      <path d="M28 52 Q28 36 42 36 Q58 36 58 52" fill="url(#pplG)" opacity=".8"/>
    </svg>
  );
}

export function GavelIcon({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <defs>
        <linearGradient id={`gav${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d97706"/><stop offset="100%" stopColor="#92400e"/>
        </linearGradient>
      </defs>
      <rect x="12" y="52" width="38" height="12" rx="5" fill={`url(#gav${size})`} transform="rotate(-40 12 52)"/>
      <rect x="34" y="10" width="32" height="18" rx="5" fill={`url(#gav${size})`} transform="rotate(-40 34 10)"/>
      <rect x="46" y="4" width="16" height="14" rx="4" fill="#fbbf24" opacity=".85" transform="rotate(-40 46 4)"/>
      <rect x="10" y="66" width="44" height="7" rx="3" fill={`url(#gav${size})`} opacity=".8"/>
    </svg>
  );
}

export function ScrollIcon({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <defs>
        <linearGradient id="scrollG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d97706"/><stop offset="100%" stopColor="#a16207"/>
        </linearGradient>
      </defs>
      <rect x="14" y="14" width="52" height="56" rx="6" fill="url(#scrollG)" opacity=".85"/>
      <rect x="14" y="14" width="52" height="10" rx="5" fill="#fbbf24" opacity=".7"/>
      <rect x="14" y="60" width="52" height="10" rx="5" fill="#fbbf24" opacity=".7"/>
      <line x1="24" y1="32" x2="56" y2="32" stroke="#fde68a" strokeWidth="2" opacity=".6"/>
      <line x1="24" y1="40" x2="56" y2="40" stroke="#fde68a" strokeWidth="2" opacity=".6"/>
      <line x1="24" y1="48" x2="46" y2="48" stroke="#fde68a" strokeWidth="2" opacity=".6"/>
    </svg>
  );
}

export function PeopleGroupIcon({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <defs>
        <radialGradient id="pgrp" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#a78bfa"/>
          <stop offset="100%" stopColor="#5b21b6"/>
        </radialGradient>
        <filter id="pgrpGlow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx="26" cy="24" r="11" fill="url(#pgrp)" opacity=".7" filter="url(#pgrpGlow)"/>
      <path d="M6 64 Q6 46 26 46 Q38 46 42 54" fill="url(#pgrp)" opacity=".6"/>
      <circle cx="54" cy="22" r="11" fill="url(#pgrp)" opacity=".9" filter="url(#pgrpGlow)"/>
      <path d="M34 64 Q34 44 54 44 Q74 44 74 64" fill="url(#pgrp)" opacity=".85"/>
    </svg>
  );
}

export function ReportIcon({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <defs>
        <linearGradient id="repG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#4f46e5"/>
        </linearGradient>
      </defs>
      <rect x="12" y="10" width="56" height="62" rx="7" fill="url(#repG)" opacity=".85"/>
      <rect x="12" y="10" width="10" height="62" rx="4" fill="#4338ca" opacity=".7"/>
      <rect x="28" y="44" width="8" height="20" rx="2" fill="#a5b4fc" opacity=".9"/>
      <rect x="40" y="36" width="8" height="28" rx="2" fill="#34d399" opacity=".9"/>
      <rect x="52" y="28" width="8" height="36" rx="2" fill="#f472b6" opacity=".85"/>
    </svg>
  );
}

export function TrophyIcon() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
      <defs>
        <radialGradient id="trophyG" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#fde68a"/>
          <stop offset="60%" stopColor="#d97706"/>
          <stop offset="100%" stopColor="#92400e"/>
        </radialGradient>
        <filter id="trophyGlow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse cx="45" cy="60" rx="24" ry="4" fill="#92400e" opacity=".4"/>
      <path d="M28 18 Q28 50 45 52 Q62 50 62 18Z" fill="url(#trophyG)" filter="url(#trophyGlow)"/>
      <path d="M28 22 Q18 22 18 34 Q18 44 28 46" fill="none" stroke="#d97706" strokeWidth="5" strokeLinecap="round"/>
      <path d="M62 22 Q72 22 72 34 Q72 44 62 46" fill="none" stroke="#d97706" strokeWidth="5" strokeLinecap="round"/>
      <rect x="37" y="52" width="16" height="10" fill="#d97706"/>
      <rect x="28" y="62" width="34" height="6" rx="3" fill="#d97706"/>
      <ellipse cx="45" cy="30" rx="8" ry="4" fill="#fde68a" opacity=".5"/>
    </svg>
  );
}

export function MoneyBagIcon() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
      <defs>
        <radialGradient id="bagG" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#d4a96a"/>
          <stop offset="100%" stopColor="#92400e"/>
        </radialGradient>
      </defs>
      <rect x="20" y="35" width="50" height="40" rx="10" fill="url(#bagG)" opacity=".9"/>
      <path d="M33 35 Q33 22 45 22 Q57 22 57 35" fill="none" stroke="#a16207" strokeWidth="5" strokeLinecap="round"/>
      <rect x="38" y="50" width="14" height="2" rx="1" fill="#92400e" opacity=".6"/>
      <rect x="38" y="55" width="14" height="2" rx="1" fill="#92400e" opacity=".6"/>
      <ellipse cx="45" cy="42" rx="8" ry="3" fill="#fde68a" opacity=".25"/>
    </svg>
  );
}
