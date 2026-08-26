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
    title: 'WEIGHT ALLOCATION',
    subtitle: 'Additive Base & Contrast Scaling',
    formula: 'w_i = 1 + α · (ρ_i / ρ_max)^k',
    description: 'Additive formulation: uniform base 1.0 guarantees visibility, while α · (ρ/ρ_max)^k expands bursts.',
    guarantee: 'Base 1.0 prevents interval collapse',
    accentColor: '#8b5cf6', // Violet
    icon: '⚖️',
  },
  {
    id: 'step-4-integrate',
    stepNumber: 'STEP 04',
    title: 'COORDINATE INTEGRATION',
    subtitle: 'Cumulative Mapping',
    formula: 'x_k = W · (Σ_{i=1}^k w_i) / W_total',
    description: 'Prefix-sum integration maps timestamps to exact monotonic visual coordinates.',
    guarantee: 'Fixed width W & strict order',
    accentColor: '#10b981', // Emerald
    icon: '🗺️',
  },
];
