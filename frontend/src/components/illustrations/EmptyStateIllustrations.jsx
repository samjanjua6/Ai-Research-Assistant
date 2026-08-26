import React from 'react'

/**
 * 1. NoRunsIllustration — for empty research history
 */
export function NoRunsIllustration({ size = 120, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`empty-svg illustration-float ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="noRunsGlow" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--violet)" stopOpacity="0.25" />
          <stop offset="1" stopColor="var(--violet-soft)" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="noRunsDoc" x1="30" y1="25" x2="85" y2="95" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--panel-alt)" />
          <stop offset="1" stopColor="var(--panel)" />
        </linearGradient>
      </defs>

      {/* Ambient background glow circle */}
      <circle cx="60" cy="60" r="45" fill="url(#noRunsGlow)" />
      
      {/* Dashed outer orbital ring */}
      <circle
        cx="60"
        cy="60"
        r="48"
        stroke="var(--violet)"
        strokeOpacity="0.3"
        strokeWidth="1.5"
        strokeDasharray="4 6"
        className="illustration-orbit"
      />

      {/* Back document card */}
      <rect
        x="42"
        y="26"
        width="44"
        height="56"
        rx="8"
        fill="var(--border)"
        opacity="0.4"
        transform="rotate(6 64 54)"
      />

      {/* Main document card */}
      <rect
        x="36"
        y="28"
        width="46"
        height="60"
        rx="8"
        fill="url(#noRunsDoc)"
        stroke="var(--border)"
        strokeWidth="1.5"
      />

      {/* Lines on document */}
      <rect x="44" y="40" width="22" height="3.5" rx="1.75" fill="var(--violet)" opacity="0.8" />
      <rect x="44" y="49" width="30" height="2.5" rx="1.25" fill="var(--text-dim)" opacity="0.5" />
      <rect x="44" y="56" width="26" height="2.5" rx="1.25" fill="var(--text-dim)" opacity="0.35" />
      <rect x="44" y="63" width="18" height="2.5" rx="1.25" fill="var(--text-dim)" opacity="0.2" />

      {/* Telescope / Magnifier floating over doc */}
      <g transform="translate(62, 58)">
        <circle cx="16" cy="16" r="14" fill="var(--panel)" stroke="var(--violet)" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="9" fill="var(--violet)" fillOpacity="0.12" />
        {/* Glass reflection */}
        <path
          d="M10 13 A 8 8 0 0 1 18 9"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
        {/* Handle */}
        <path
          d="M26 26 L36 36"
          stroke="var(--violet)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </g>

      {/* Sparkle Stars */}
      <path
        d="M28 24 L29.5 28 L33.5 29.5 L29.5 31 L28 35 L26.5 31 L22.5 29.5 L26.5 28 Z"
        fill="var(--violet)"
        className="illustration-sparkle"
      />
      <path
        d="M92 78 L93 81 L96 82 L93 83 L92 86 L91 83 L88 82 L91 81 Z"
        fill="var(--violet)"
        opacity="0.8"
        className="illustration-sparkle-delayed"
      />
    </svg>
  )
}

/**
 * 2. NoMatchesIllustration — for search with 0 results
 */
export function NoMatchesIllustration({ size = 100, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`empty-svg ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="noMatchGlow" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--violet)" stopOpacity="0.2" />
          <stop offset="1" stopColor="transparent" />
        </linearGradient>
      </defs>

      <circle cx="50" cy="50" r="38" fill="url(#noMatchGlow)" />
      
      {/* Radar waves */}
      <circle cx="45" cy="45" r="28" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
      <circle cx="45" cy="45" r="20" stroke="var(--border)" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />

      {/* Central Magnifying Glass with question mark */}
      <circle cx="45" cy="45" r="16" fill="var(--panel)" stroke="var(--text-dim)" strokeWidth="2" />
      <text
        x="45"
        y="50"
        textAnchor="middle"
        fill="var(--text-dim)"
        fontSize="14"
        fontWeight="700"
        fontFamily="sans-serif"
      >
        ?
      </text>

      {/* Handle */}
      <line x1="57" y1="57" x2="72" y2="72" stroke="var(--text-dim)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/**
 * 3. ErrorStateIllustration — for failed research runs
 */
export function ErrorStateIllustration({ size = 110, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 110 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`empty-svg illustration-float ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="errorGlow" x1="25" y1="25" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f43f5e" stopOpacity="0.25" />
          <stop offset="1" stopColor="transparent" />
        </linearGradient>
      </defs>

      {/* Ambient error glow */}
      <circle cx="55" cy="55" r="42" fill="url(#errorGlow)" />

      {/* Outer broken circuit ring */}
      <circle
        cx="55"
        cy="55"
        r="44"
        stroke="#f43f5e"
        strokeOpacity="0.3"
        strokeWidth="1.5"
        strokeDasharray="8 6 2 6"
      />

      {/* Hexagonal Shield */}
      <path
        d="M55 24 L82 38 V62 L55 86 L28 62 V38 Z"
        fill="var(--panel)"
        stroke="rgba(244, 63, 94, 0.45)"
        strokeWidth="2"
      />

      {/* Warning Triangle Inside Shield */}
      <path
        d="M55 38 L69 64 H41 Z"
        fill="rgba(244, 63, 94, 0.12)"
        stroke="#f43f5e"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Exclamation Mark */}
      <line x1="55" y1="47" x2="55" y2="55" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="55" cy="60" r="1.5" fill="#f43f5e" />
    </svg>
  )
}

/**
 * 4. OfflineIllustration — for network disconnects
 */
export function OfflineIllustration({ size = 110, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 110 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`empty-svg ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="offlineGlow" x1="20" y1="20" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--violet)" stopOpacity="0.2" />
          <stop offset="1" stopColor="transparent" />
        </linearGradient>
      </defs>

      <circle cx="55" cy="55" r="42" fill="url(#offlineGlow)" />

      {/* Cloud outline */}
      <path
        d="M34 62 A 14 14 0 0 1 45 42 A 18 18 0 0 1 76 46 A 14 14 0 0 1 76 62 Z"
        fill="var(--panel)"
        stroke="var(--border)"
        strokeWidth="2"
      />

      {/* Diagonal disconnect slash */}
      <line x1="30" y1="75" x2="80" y2="35" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />

      {/* Signal pulses */}
      <path d="M48 68 L52 74" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" />
      <path d="M58 68 L62 74" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/**
 * 5. ReportNotFoundIllustration — for 404 / private public reports
 */
export function ReportNotFoundIllustration({ size = 120, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`empty-svg illustration-float ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lockGlow" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--violet)" stopOpacity="0.2" />
          <stop offset="1" stopColor="transparent" />
        </linearGradient>
      </defs>

      <circle cx="60" cy="60" r="46" fill="url(#lockGlow)" />
      
      {/* Orbital Ring */}
      <ellipse cx="60" cy="60" rx="50" ry="18" stroke="var(--violet)" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="6 4" transform="rotate(-15 60 60)" />

      {/* Padlock Body */}
      <rect x="42" y="52" width="36" height="30" rx="6" fill="var(--panel)" stroke="var(--violet)" strokeWidth="2" />
      
      {/* Padlock Shackle */}
      <path
        d="M48 52 V42 A 12 12 0 0 1 72 42 V52"
        fill="none"
        stroke="var(--violet)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Keyhole */}
      <circle cx="60" cy="64" r="3" fill="var(--violet)" />
      <path d="M59 66 L58 73 H62 L61 66 Z" fill="var(--violet)" />
    </svg>
  )
}

/**
 * 6. NoSourcesIllustration — for synthesis with 0 cited web sources
 */
export function NoSourcesIllustration({ size = 90, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 90 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`empty-svg ${className}`}
      aria-hidden="true"
    >
      <circle cx="45" cy="45" r="34" fill="var(--violet-soft)" opacity="0.3" />
      
      {/* Open Book */}
      <path
        d="M25 36 C 32 34, 40 36, 45 40 C 50 36, 58 34, 65 36 V 60 C 58 58, 50 60, 45 64 C 40 60, 32 58, 25 60 Z"
        fill="var(--panel)"
        stroke="var(--border)"
        strokeWidth="1.5"
      />
      <line x1="45" y1="40" x2="45" y2="64" stroke="var(--border)" strokeWidth="1.5" />

      {/* Sparkle */}
      <path
        d="M45 22 L46.5 25.5 L50 27 L46.5 28.5 L45 32 L43.5 28.5 L40 27 L43.5 25.5 Z"
        fill="var(--violet)"
      />
    </svg>
  )
}

/**
 * 7. WelcomeHeroIllustration — for main welcome card
 */
export function WelcomeHeroIllustration({ className = '' }) {
  return (
    <div className={`welcome-hero-banner ${className}`}>
      <svg
        viewBox="0 0 420 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="welcome-hero-svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="heroLineGlow" x1="0" y1="45" x2="420" y2="45" gradientUnits="userSpaceOnUse">
            <stop stopColor="transparent" />
            <stop offset="0.2" stopColor="var(--violet)" stopOpacity="0.4" />
            <stop offset="0.8" stopColor="var(--violet)" stopOpacity="0.4" />
            <stop offset="1" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Interconnecting pipeline path */}
        <path
          d="M 50 45 L 140 45 L 230 45 L 320 45 L 370 45"
          stroke="url(#heroLineGlow)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />

        {/* Node 1: Plan */}
        <g transform="translate(60, 45)">
          <circle cx="0" cy="0" r="18" fill="var(--panel)" stroke="var(--violet)" strokeWidth="1.5" />
          <g transform="translate(-7, -7)">
            <rect x="2" y="2" width="10" height="10" rx="1.5" fill="none" stroke="var(--violet)" strokeWidth="1.5" />
            <path d="M5 5h4M5 7.5h4M5 10h2" stroke="var(--violet)" strokeWidth="1.2" strokeLinecap="round" />
          </g>
          <text x="0" y="28" textAnchor="middle" fill="var(--text-dim)" fontSize="9" fontWeight="600">PLAN</text>
        </g>

        {/* Node 2: Search */}
        <g transform="translate(150, 45)">
          <circle cx="0" cy="0" r="18" fill="var(--panel)" stroke="var(--violet)" strokeWidth="1.5" />
          <g transform="translate(-6, -6)">
            <circle cx="5" cy="5" r="3.5" fill="none" stroke="var(--violet)" strokeWidth="1.5" />
            <path d="M7.5 7.5L11 11" stroke="var(--violet)" strokeWidth="1.5" strokeLinecap="round" />
          </g>
          <text x="0" y="28" textAnchor="middle" fill="var(--text-dim)" fontSize="9" fontWeight="600">SEARCH</text>
        </g>

        {/* Node 3: Synthesize */}
        <g transform="translate(240, 45)">
          <circle cx="0" cy="0" r="18" fill="var(--panel)" stroke="var(--violet)" strokeWidth="1.5" />
          <g transform="translate(-6, -6)">
            <path d="M9.5 2.5L10.5 3.5L4 10H3V9L9.5 2.5Z" fill="none" stroke="var(--violet)" strokeWidth="1.4" strokeLinejoin="round" />
          </g>
          <text x="0" y="28" textAnchor="middle" fill="var(--text-dim)" fontSize="9" fontWeight="600">DRAFT</text>
        </g>

        {/* Node 4: Verify */}
        <g transform="translate(330, 45)">
          <circle cx="0" cy="0" r="18" fill="var(--panel)" stroke="var(--violet)" strokeWidth="2" />
          <circle cx="0" cy="0" r="22" fill="none" stroke="var(--violet)" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3 3" />
          <g transform="translate(-7, -7)">
            <path d="M7 1L8.5 5.5L13 7L8.5 8.5L7 13L5.5 8.5L1 7L5.5 5.5L7 1Z" fill="var(--violet)" />
          </g>
          <text x="0" y="28" textAnchor="middle" fill="var(--violet)" fontSize="9" fontWeight="700">REPORT</text>
        </g>
      </svg>
    </div>
  )
}

/**
 * Reusable EmptyState Component
 */
export function EmptyState({
  illustration,
  title,
  description,
  action,
  children,
  className = '',
}) {
  return (
    <div className={`empty-state-card ${className}`}>
      {illustration && <div className="empty-state-svg-wrap">{illustration}</div>}
      {title && <h4 className="empty-state-title">{title}</h4>}
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
      {children}
    </div>
  )
}
