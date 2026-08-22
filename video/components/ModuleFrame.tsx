import type { CSSProperties, ReactNode } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_FAMILY, VIDEO_COLORS } from '../theme';

export type ModuleLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
};

type ModuleFrameProps = {
  title: string;
  eyebrow: string;
  role: string;
  roleDetail: string;
  accent: string;
  enterAt: number;
  isolated: ModuleLayout;
  assembled: ModuleLayout;
  assemblyProgress: number;
  children: ReactNode;
};

const mix = (from: number, to: number, progress: number) =>
  interpolate(progress, [0, 1], [from, to]);

export function ModuleFrame({
  title,
  eyebrow,
  role,
  roleDetail,
  accent,
  enterAt,
  isolated,
  assembled,
  assemblyProgress,
  children,
}: ModuleFrameProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({
    frame: frame - enterAt,
    fps,
    durationInFrames: 38,
    config: { damping: 18, stiffness: 130, mass: 1.1 },
  });
  const roleOpacity = interpolate(assemblyProgress, [0, 0.55], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const float = Math.sin((frame - enterAt) / 25) * 5 * (1 - assemblyProgress);
  const x = mix(isolated.x, assembled.x, assemblyProgress);
  const y = mix(isolated.y, assembled.y, assemblyProgress) + float;
  const width = mix(isolated.width, assembled.width, assemblyProgress);
  const height = mix(isolated.height, assembled.height, assemblyProgress);
  const rotate = mix(isolated.rotate, assembled.rotate, assemblyProgress);

  const style: CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width,
    height,
    opacity: entrance,
    transform: `translateY(${(1 - entrance) * 90}px) scale(${0.88 + entrance * 0.12}) rotate(${rotate}deg)`,
    transformOrigin: 'center',
    border: `1px solid ${assemblyProgress > 0.8 ? VIDEO_COLORS.border : VIDEO_COLORS.borderBright}`,
    borderRadius: mix(22, 10, assemblyProgress),
    background: VIDEO_COLORS.panel,
    boxShadow: `0 ${mix(34, 14, assemblyProgress)}px ${mix(75, 36, assemblyProgress)}px rgba(0,0,0,${mix(0.5, 0.34, assemblyProgress)})`,
    overflow: 'visible',
    fontFamily: FONT_FAMILY,
  };

  return (
    <div style={style}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 42,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${VIDEO_COLORS.border}`,
            padding: '0 16px',
            background: VIDEO_COLORS.backgroundElevated,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                background: accent,
                boxShadow: `0 0 16px ${accent}`,
              }}
            />
            <span style={{ color: VIDEO_COLORS.text, fontSize: 14, fontWeight: 650 }}>{title}</span>
          </div>
          <span
            style={{
              color: VIDEO_COLORS.textMuted,
              fontSize: 9,
              letterSpacing: 1.8,
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </span>
        </div>
        <div style={{ height: 'calc(100% - 42px)' }}>{children}</div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: -82,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          opacity: roleOpacity,
          transform: `translateY(${(1 - entrance) * 18}px)`,
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{ width: 34, height: 1, background: accent }} />
        <div>
          <div
            style={{
              color: accent,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2.2,
              textTransform: 'uppercase',
            }}
          >
            {role}
          </div>
          <div style={{ color: VIDEO_COLORS.text, fontSize: 22, fontWeight: 560, marginTop: 5 }}>
            {roleDetail}
          </div>
        </div>
      </div>
    </div>
  );
}
