interface IP {
  size?: number;
  className?: string;
}

export const PauseIcon = ({ size = 20, className }: IP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <rect x="5.5" y="4.5" width="4.6" height="15" rx="1.6" />
    <rect x="13.9" y="4.5" width="4.6" height="15" rx="1.6" />
  </svg>
);

export const PlayIcon = ({ size = 20, className }: IP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M7 4.6c0-1 1.1-1.6 1.9-1.1l11 7.4c.7.5.7 1.6 0 2.1l-11 7.4c-.8.5-1.9-.1-1.9-1.1V4.6z" />
  </svg>
);

export const SoundIcon = ({ on, size = 20, className }: IP & { on: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M4 9.5v5h3.6l4.9 4V5.5l-4.9 4H4z" fill="currentColor" />
    {on ? (
      <>
        <path d="M16 9a4.2 4.2 0 0 1 0 6" />
        <path d="M18.6 6.4a8 8 0 0 1 0 11.2" />
      </>
    ) : (
      <>
        <path d="M16.5 9.5l5 5" />
        <path d="M21.5 9.5l-5 5" />
      </>
    )}
  </svg>
);

export const StarIcon = ({ size = 24, className, filled = true }: IP & { filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
    <path
      d="M12 2.2l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.1l-6 3.5 1.3-6.7-5-4.7 6.8-.8L12 2.2z"
      fill={filled ? "#ffd84a" : "rgba(255,216,74,0.08)"}
      stroke={filled ? "#fff3b0" : "rgba(255,216,74,0.45)"}
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

export const HeartIcon = ({ size = 20, className, filled = true }: IP & { filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
    <path
      d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 2.8 4.5 6.4 4.5c2.1 0 3.8 1.2 5.6 3.4 1.8-2.2 3.5-3.4 5.6-3.4 3.6 0 5.5 3.8 4 7.2C19.5 16.4 12 21 12 21z"
      fill={filled ? "#ff3f7a" : "rgba(255,63,122,0.08)"}
      stroke={filled ? "#ffb3cb" : "rgba(255,92,122,0.4)"}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const TrophyIcon = ({ size = 20, className }: IP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" fill="currentColor" fillOpacity="0.25" />
    <path d="M8 6H4.5c0 3 1.3 4.6 3.7 5" />
    <path d="M16 6h3.5c0 3-1.3 4.6-3.7 5" />
    <path d="M12 13v4" />
    <path d="M8.5 20.5h7M9.5 17h5l.5 3.5h-6l.5-3.5z" />
  </svg>
);

export const RestartIcon = ({ size = 20, className }: IP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M4 12a8 8 0 1 0 2.6-5.9" />
    <path d="M4 4.5v4.8h4.8" />
  </svg>
);

export const HomeIcon = ({ size = 20, className }: IP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M3.5 11L12 3.5 20.5 11" />
    <path d="M5.5 9.5V20h13V9.5" />
  </svg>
);

export const HelpIcon = ({ size = 20, className }: IP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.4 9.3a2.7 2.7 0 1 1 3.8 2.5c-.8.4-1.2 1-1.2 1.9" />
    <circle cx="12" cy="17" r="0.6" fill="currentColor" />
  </svg>
);

export const ArrowIcon = ({ size = 20, className }: IP) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M19 12H5" />
    <path d="M11 6l-6 6 6 6" />
  </svg>
);

/** Animated orbit logo */
export const Logo = ({ size = 110 }: IP) => (
  <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden className="anim-float">
    <defs>
      <radialGradient id="lg-core" cx="40%" cy="38%" r="70%">
        <stop offset="0" stopColor="#fff" />
        <stop offset="0.5" stopColor="#9ff4ff" />
        <stop offset="1" stopColor="#3de9ff" />
      </radialGradient>
      <radialGradient id="lg-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#3de9ff" stopOpacity="0.55" />
        <stop offset="1" stopColor="#3de9ff" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="60" cy="60" r="58" fill="url(#lg-glow)" />
    <g className="orbit-a">
      <ellipse cx="60" cy="60" rx="50" ry="19" fill="none" stroke="#b57bff" strokeWidth="3" transform="rotate(-24 60 60)" />
      <circle cx="108" cy="46" r="6" fill="#ff3fd1" />
    </g>
    <g className="orbit-b">
      <ellipse cx="60" cy="60" rx="50" ry="19" fill="none" stroke="#3de9ff" strokeOpacity="0.7" strokeWidth="2.5" transform="rotate(38 60 60)" />
      <circle cx="26" cy="94" r="5" fill="#ffd84a" />
    </g>
    <circle cx="60" cy="60" r="20" fill="url(#lg-core)" />
    <circle cx="53" cy="52" r="6" fill="#fff" opacity="0.8" />
  </svg>
);
