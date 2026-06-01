/** Semantic tokens align with globals.css — use for inline styles or docs; prefer Tailwind theme classes in components. */
export const designTokens = {
  colors: {
    void: "#0c0612",
    plum: "#1a0a1f",
    wine: "#2a0a12",
    blood: "#7f1d1d",
    gold: "#c9a227",
    goldBright: "#e8d089",
    parchment: "#f4ead8",
    mist: "#c4b8c8",
  },
  radii: {
    frame: "1rem",
    rune: "0.375rem",
  },
  transitions: {
    glow: "box-shadow 0.35s ease, border-color 0.35s ease",
    slide: "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease",
  },
} as const;

/** Guess the Card — gameplay UI, panels, warm fantasy backdrop. */
export const guessAssetPaths = {
  logoLockup: "/assets/guess-logo.png",
  logoMark: "/assets/guess-logo-header.png",
  background: "/assets/guess-bg.png",
  panelTexture: "/assets/guess-panel.png",
} as const;

/** Codex of Rathe — hub (`/`) arcane identity. */
export const codexAssetPaths = {
  logoLockup: "/assets/codex-logo.png",
  logoMark: "/assets/codex-logo-header.png",
  background: "/assets/codex-bg.png",
} as const;

/** Fragments of Rathe — puzzle experience identity. */
export const fragmentsAssetPaths = {
  logoLockup: "/assets/fragments-logo.png",
  logoMark: "/assets/fragments-logo-header.png",
  background: "/assets/fragments-bg.png",
} as const;

/** @deprecated Prefer `guessAssetPaths` (same object). */
export const assetPaths = guessAssetPaths;
