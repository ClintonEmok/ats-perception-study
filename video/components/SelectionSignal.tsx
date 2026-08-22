import { interpolate } from 'remotion';
import { VIDEO_COLORS } from '../theme';

type SelectionSignalProps = {
  progress: number;
  opacity: number;
};

const pathLength = 1050;

export function SelectionSignal({ progress, opacity }: SelectionSignalProps) {
  const draw = interpolate(progress, [0, 0.65], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const mapPulse = interpolate(progress, [0.38, 0.54, 0.7], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cubePulse = interpolate(progress, [0.58, 0.74, 0.9], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <svg
      width="1920"
      height="1080"
      viewBox="0 0 1920 1080"
      style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}
    >
      <defs>
        <filter id="signal-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path
        d="M1055 837 C1055 740 1005 690 725 610 C575 565 520 480 520 410 M1055 837 C1130 700 1380 700 1440 530 C1465 460 1430 390 1415 360"
        fill="none"
        stroke={VIDEO_COLORS.violet}
        strokeWidth="3"
        strokeDasharray={pathLength}
        strokeDashoffset={pathLength * (1 - draw)}
        strokeLinecap="round"
        opacity="0.72"
        filter="url(#signal-glow)"
      />
      <circle cx="520" cy="410" r={20 + mapPulse * 32} fill="none" stroke={VIDEO_COLORS.violetLight} strokeWidth="3" opacity={mapPulse} />
      <circle cx="520" cy="410" r={7 + mapPulse * 8} fill={VIDEO_COLORS.violetLight} opacity={mapPulse} />
      <circle cx="1415" cy="360" r={20 + cubePulse * 32} fill="none" stroke={VIDEO_COLORS.violetLight} strokeWidth="3" opacity={cubePulse} />
      <circle cx="1415" cy="360" r={7 + cubePulse * 8} fill={VIDEO_COLORS.violetLight} opacity={cubePulse} />
    </svg>
  );
}
