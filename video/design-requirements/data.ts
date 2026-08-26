export const DESIGN_COLORS = {
  background: '#ffffff',
  backgroundElevated: '#f8fafc',
  cardBg: '#ffffff',
  cardBorder: '#e2e8f0',
  cardBorderHover: '#cbd5e1',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  
  // Stream 1: Analytical Tasks (Violet / Indigo)
  tasks: {
    accent: '#6366f1',
    accentDark: '#4338ca',
    accentLight: '#e0e7ff',
    badge: '#ede9fe',
    badgeText: '#6d28d9',
  },

  // Stream 2: Data Properties (Amber / Red)
  data: {
    accent: '#f59e0b',
    accentDark: '#d97706',
    accentLight: '#fef3c7',
    badge: '#ffedd5',
    badgeText: '#c2410c',
    burstRed: '#ef4444',
  },

  // Stream 3: Visualization Principles (Sky / Cyan / Blue)
  principles: {
    accent: '#0284c7',
    accentDark: '#0369a1',
    accentLight: '#e0f2fe',
    badge: '#e0f2fe',
    badgeText: '#0369a1',
  },

  // Goals (Emerald / Violet / Slate)
  goals: {
    accent: '#0d9488',
    accentDark: '#0f766e',
    accentLight: '#f0fdfa',
    border: '#ccfbf1',
    text: '#115e59',
  },

  // Requirements (Blue / Indigo)
  reqs: {
    bg: '#ffffff',
    border: '#e2e8f0',
    borderActive: '#818cf8',
    badgeBg: '#f1f5f9',
    badgeText: '#1e293b',
  },
} as const;

export const GOALS_DATA = [
  {
    id: 'G1',
    short: 'SALIENCE',
    name: 'Temporal salience',
    desc: 'Dense bursts expanded visually',
    accent: '#ec4899', // Pink / Rose
    bg: '#fdf2f8',
    border: '#fbcfe8',
    text: '#9d174d',
  },
  {
    id: 'G2',
    short: 'REFERENCEABILITY',
    name: 'Direct referenceability',
    desc: 'Continuous real timestamps',
    accent: '#3b82f6', // Blue
    bg: '#eff6ff',
    border: '#bfdbfe',
    text: '#1e40af',
  },
  {
    id: 'G3',
    short: 'FIDELITY',
    name: 'Topological fidelity',
    desc: 'True spatial coordinates',
    accent: '#10b981', // Emerald
    bg: '#ecfdf5',
    border: '#a7f3d0',
    text: '#065f46',
  },
  {
    id: 'G4',
    short: 'ORDER',
    name: 'Temporal order',
    desc: 'Strict monotonic progression',
    accent: '#8b5cf6', // Violet
    bg: '#f5f3ff',
    border: '#ddd6fe',
    text: '#5b21b6',
  },
  {
    id: 'G5',
    short: 'CONTEXT',
    name: 'Global context',
    desc: 'Macro overview retained',
    accent: '#f59e0b', // Amber
    bg: '#fffbeb',
    border: '#fde68a',
    text: '#92400e',
  },
] as const;

export const REQUIREMENTS_DATA = [
  {
    id: 'R1',
    title: 'DENSE VISIBLE',
    subtitle: 'High-density burst periods expand on time axis',
    tag: 'Salience',
    accent: '#ec4899',
    icon: 'Maximize2',
  },
  {
    id: 'R2',
    title: 'ORDER PRESERVED',
    subtitle: 'Monotonic sequence strictly preserved across time',
    tag: 'Topology',
    accent: '#8b5cf6',
    icon: 'ArrowRight',
  },
  {
    id: 'R3',
    title: 'TIME ACCESSIBLE',
    subtitle: 'Direct referenceability to original clock timestamps',
    tag: 'Metric',
    accent: '#3b82f6',
    icon: 'Clock',
  },
  {
    id: 'R4',
    title: 'SPACE PRESERVED',
    subtitle: 'Zero distortion to 2D geographic coordinates',
    tag: 'Fidelity',
    accent: '#10b981',
    icon: 'MapPin',
  },
  {
    id: 'R5a',
    title: 'OVERVIEW + FOCUS',
    subtitle: 'Macro overview preserved alongside micro inspection',
    tag: 'Context',
    accent: '#f59e0b',
    icon: 'Layers',
  },
  {
    id: 'R5b',
    title: 'LINKED SELECTION',
    subtitle: 'Bidirectional sync across timeline, map & 3D cube',
    tag: 'Workflow',
    accent: '#06b6d4',
    icon: 'Link',
  },
] as const;
