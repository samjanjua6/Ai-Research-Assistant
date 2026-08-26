/**
 * Logo — Official geometric vector brand mark for AI Research Assistant.
 * Represents multi-step neural node graph reasoning, synthesis, and deep intelligence.
 */

export function LogoMark({ size = 22, className = '' }) {
  const gradId = `brand-grad-${Math.random().toString(36).substr(2, 6)}`
  const glowId = `brand-glow-${Math.random().toString(36).substr(2, 6)}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`brand-logo-svg ${className}`}
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}
      aria-hidden="true"
    >
      <defs>
        {/* Vibrant Violet to Cyan/Emerald Gradient */}
        <linearGradient id={gradId} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8E7CF7" />
          <stop offset="45%" stopColor="#7C6AF0" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        {/* Ambient Subtle Glow */}
        <linearGradient id={glowId} x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#7C6AF0" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Outer Rounded Container Pill / Diamond Contour */}
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="8"
        fill={`url(#${glowId})`}
        stroke={`url(#${gradId})`}
        strokeWidth="1.2"
        strokeOpacity="0.5"
      />

      {/* Internal Multi-Node Reasoning Graph */}
      {/* Connecting Synapse Lines */}
      <path
        d="M16 6.5L24 13.5L21 23.5L11 23.5L8 13.5L16 6.5Z"
        stroke={`url(#${gradId})`}
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeOpacity="0.65"
      />
      <path
        d="M16 6.5L16 16M24 13.5L16 16M21 23.5L16 16M11 23.5L16 16M8 13.5L16 16"
        stroke={`url(#${gradId})`}
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeOpacity="0.8"
      />

      {/* Central Quantum Synthesis Nucleus */}
      <circle cx="16" cy="16" r="2.8" fill={`url(#${gradId})`} />
      <circle cx="16" cy="16" r="4.2" stroke="#FFFFFF" strokeWidth="0.75" strokeOpacity="0.6" strokeDasharray="1.5 1.5" />

      {/* Reasoning Nodes */}
      <circle cx="16" cy="6.5" r="1.75" fill="#38BDF8" />
      <circle cx="24" cy="13.5" r="1.75" fill="#818CF8" />
      <circle cx="21" cy="23.5" r="1.75" fill="#A78BFA" />
      <circle cx="11" cy="23.5" r="1.75" fill="#C084FC" />
      <circle cx="8" cy="13.5" r="1.75" fill="#38BDF8" />
    </svg>
  )
}

export function Logo({ size = 22, showText = true, className = '' }) {
  return (
    <div
      className={`brand-lockup ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9,
        fontWeight: 700,
        textDecoration: 'none',
        userSelect: 'none',
      }}
    >
      <LogoMark size={size} />
      {showText && (
        <span className="brand-title-text" style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          <span style={{ color: 'var(--text)' }}>Research</span>{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, var(--violet), #06B6D4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Assistant
          </span>
        </span>
      )}
    </div>
  )
}

export default Logo
