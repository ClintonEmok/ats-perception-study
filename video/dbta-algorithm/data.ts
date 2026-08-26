export const DARK_TEXT = '#0f172a';
export const MUTED_TEXT = '#475569';
export const TUE_RED = '#C8102E';
export const BORDER_COLOR = '#334155';

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

export interface AlgorithmStep {
  id: string;
  stepNumber: string;
  title: string;
  subtitle: string;
  formula: string;
  description: string;
  accentColor: string;
  icon: string;
}

export const DBTA_STEPS: AlgorithmStep[] = [
  {
    id: 'step-1-raw-events',
    stepNumber: 'STEP 01',
    title: 'RAW EVENT SEQUENCE',
    subtitle: 'Continuous Domain',
    formula: 'T = {t_1, t_2, ..., t_N}',
    description: 'Raw crime events with exact, irregular timestamps across continuous time.',
    accentColor: '#475569', // Slate / Charcoal
    icon: '⚡',
  },
  {
    id: 'step-2-hourly-binning',
    stepNumber: 'STEP 02',
    title: 'HOURLY BINNING',
    subtitle: 'Domain Discretization',
    formula: 'Δt_i = [t_i, t_{i+1}], Δt = 1h',
    description: 'Discretizes continuous time into uniform 1-hour reference intervals.',
    accentColor: '#2563eb', // Royal Blue
    icon: '⊞',
  },
  {
    id: 'step-3-density',
    stepNumber: 'STEP 03',
    title: 'DENSITY ESTIMATION',
    subtitle: 'Signal Measurement',
    formula: 'ρ_i = N_i / |Δt_i|',
    description: 'Counts events per hour to compute the continuous temporal density signal.',
    accentColor: TUE_RED, // TU/e Red
    icon: '📈',
  },
  {
    id: 'step-4-weights',
    stepNumber: 'STEP 04',
    title: 'SPACE REALLOCATION',
    subtitle: 'Conserved Redistribution',
    formula: 's_i = (w_i / Σ w_j) · 100%',
    description: 'Reallocates visual space from uniform 20%: bursts expand to 48%, sparse bins compress.',
    accentColor: '#8b5cf6', // Violet
    icon: '⚖️',
  },
  {
    id: 'step-5-integrate',
    stepNumber: 'STEP 05',
    title: 'COORDINATE INTEGRATION',
    subtitle: 'Cumulative Mapping',
    formula: 'x_k = W · (Σ_{i=1}^k s_i) / 100%',
    description: 'Prefix-sum integration maps reallocated space to exact monotonic visual coordinates.',
    accentColor: '#10b981', // Emerald
    icon: '🗺️',
  },
];
