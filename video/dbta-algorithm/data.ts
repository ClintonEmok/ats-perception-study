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
  guarantee: string;
  accentColor: string;
  icon: string;
}

export const DBTA_STEPS: AlgorithmStep[] = [
  {
    id: 'step-1-partition',
    stepNumber: 'STEP 01',
    title: 'TEMPORAL PARTITIONING',
    subtitle: 'Domain Discretization',
    formula: 'Δt_i = [t_i, t_{i+1}]',
    description: 'Partitions continuous time domain into fixed, uniform reference intervals.',
    guarantee: 'Fixed clock-time invariant',
    accentColor: '#2563eb', // Royal Blue
    icon: '⊞',
  },
  {
    id: 'step-2-density',
    stepNumber: 'STEP 02',
    title: 'DENSITY ESTIMATION',
    subtitle: 'Signal Measurement',
    formula: 'ρ_i = N_i / |Δt_i|',
    description: 'Computes event distribution signal across each interval to quantify burstiness.',
    guarantee: 'Continuous allocation input',
    accentColor: TUE_RED, // TU/e Red
    icon: '📈',
  },
  {
    id: 'step-3-weights',
    stepNumber: 'STEP 03',
    title: 'SPACE REALLOCATION',
    subtitle: 'Conserved Space Redistribution',
    formula: 's_i = (w_i / Σ w_j) · 100%',
    description: 'Reallocates visual space from uniform 20%: bursts expand up to 48%, sparse bins compress to 11.2%.',
    guarantee: 'Conserved 100% space & floor guarantee',
    accentColor: '#8b5cf6', // Violet
    icon: '⚖️',
  },
  {
    id: 'step-4-integrate',
    stepNumber: 'STEP 04',
    title: 'COORDINATE INTEGRATION',
    subtitle: 'Cumulative Mapping',
    formula: 'x_k = W · (Σ_{i=1}^k s_i) / 100%',
    description: 'Prefix-sum integration maps reallocated space to exact monotonic visual coordinates.',
    guarantee: 'Fixed width W & strict order',
    accentColor: '#10b981', // Emerald
    icon: '🗺️',
  },
];
