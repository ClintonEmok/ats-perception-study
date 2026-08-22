import { interpolate } from 'remotion';
import { MONO_FONT, VIDEO_COLORS } from '../theme';

type TimelineModuleProps = {
  selectionProgress: number;
  linked: boolean;
};

const DENSITY = [
  16, 19, 14, 26, 24, 31, 22, 38, 34, 29, 44, 37, 53, 72, 89, 61, 48, 37, 31, 42,
  56, 48, 36, 29, 24, 31, 27, 35, 52, 63, 77, 94, 84, 59, 43, 38, 46, 34, 27, 20,
];

export function TimelineModule({ selectionProgress, linked }: TimelineModuleProps) {
  const brushLeft = interpolate(selectionProgress, [0, 1], [44, 64]);
  const brushWidth = interpolate(selectionProgress, [0, 1], [12, 9]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', padding: '16px 22px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: VIDEO_COLORS.text, fontSize: 13, fontWeight: 650 }}>Crime density over time</div>
          <div style={{ color: VIDEO_COLORS.textMuted, fontSize: 9, marginTop: 2 }}>Overview and adaptive detail window</div>
        </div>
        <div
          style={{
            border: `1px solid ${linked ? VIDEO_COLORS.violet : VIDEO_COLORS.border}`,
            borderRadius: 5,
            padding: '5px 9px',
            color: linked ? VIDEO_COLORS.violetLight : VIDEO_COLORS.textMuted,
            fontFamily: MONO_FONT,
            fontSize: 9,
            background: linked ? 'rgba(139,92,246,0.12)' : VIDEO_COLORS.panelAlt,
          }}
        >
          14 MAY 2024 · 18:00–23:00
        </div>
      </div>

      <div style={{ position: 'relative', height: 'calc(100% - 42px)', marginTop: 10 }}>
        <div
          style={{
            position: 'absolute',
            inset: '0 0 29px',
            borderLeft: `1px solid ${VIDEO_COLORS.border}`,
            borderBottom: `1px solid ${VIDEO_COLORS.border}`,
            display: 'flex',
            alignItems: 'flex-end',
            gap: '0.65%',
            padding: '8px 8px 0',
            overflow: 'hidden',
          }}
        >
          {[25, 50, 75].map((line) => (
            <div
              key={line}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: `${line}%`,
                height: 1,
                background: 'rgba(143,153,170,0.12)',
              }}
            />
          ))}
          {DENSITY.map((value, index) => {
            const percent = (index / DENSITY.length) * 100;
            const selected = percent >= brushLeft && percent <= brushLeft + brushWidth;
            return (
              <div
                key={`${index}-${value}`}
                style={{
                  zIndex: 1,
                  flex: 1,
                  height: `${value}%`,
                  minWidth: 2,
                  borderRadius: '2px 2px 0 0',
                  background: selected
                    ? VIDEO_COLORS.violet
                    : value > 70
                      ? 'rgba(245,158,11,0.62)'
                      : 'rgba(34,211,238,0.42)',
                  boxShadow: selected && linked ? `0 0 14px ${VIDEO_COLORS.violet}` : undefined,
                }}
              />
            );
          })}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${brushLeft}%`,
              width: `${brushWidth}%`,
              background: 'rgba(139,92,246,0.14)',
              border: `1.5px solid ${VIDEO_COLORS.violetLight}`,
              boxShadow: linked ? '0 0 26px rgba(139,92,246,0.32)' : undefined,
              zIndex: 2,
            }}
          >
            <div style={{ position: 'absolute', left: -3, top: 0, bottom: 0, width: 5, background: VIDEO_COLORS.violet }} />
            <div style={{ position: 'absolute', right: -3, top: 0, bottom: 0, width: 5, background: VIDEO_COLORS.violet }} />
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'space-between',
            color: VIDEO_COLORS.textMuted,
            fontFamily: MONO_FONT,
            fontSize: 8,
          }}
        >
          <span>JAN 2024</span>
          <span>MAR</span>
          <span>MAY</span>
          <span>JUL</span>
          <span>SEP</span>
          <span>DEC 2024</span>
        </div>
      </div>
    </div>
  );
}
