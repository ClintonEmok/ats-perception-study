import { AbsoluteFill, Easing, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { CubeModule } from './components/CubeModule';
import { MapModule } from './components/MapModule';
import { ModuleFrame } from './components/ModuleFrame';
import { SelectionSignal } from './components/SelectionSignal';
import { TimelineModule } from './components/TimelineModule';
import { FONT_FAMILY, MONO_FONT, VIDEO_COLORS } from './theme';

export type ConstructingDashboardProps = {
  heading: string;
  subtext: string;
};

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

export function ConstructingDashboard({ heading, subtext }: ConstructingDashboardProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleEntrance = spring({ frame, fps, durationInFrames: 48, config: { damping: 200 } });
  const titleExit = interpolate(frame, [78, 118], [1, 0], clamp);
  const assemblyProgress = interpolate(frame, [390, 535], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const selectionProgress = interpolate(frame, [555, 735], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const linked = frame >= 570;
  const dashboardHeaderOpacity = interpolate(assemblyProgress, [0.55, 1], [0, 1], clamp);
  const assemblyCaptionOpacity = interpolate(frame, [420, 455, 535, 565], [0, 1, 1, 0], clamp);
  const linkedCaptionOpacity = interpolate(frame, [555, 590, 720, 755], [0, 1, 1, 0], clamp);
  const closingEntrance = spring({
    frame: frame - 752,
    fps,
    durationInFrames: 44,
    config: { damping: 200 },
  });
  const dashboardScale = interpolate(closingEntrance, [0, 1], [1, 0.925]);
  const dashboardDim = interpolate(closingEntrance, [0, 1], [1, 0.62]);

  return (
    <AbsoluteFill
      style={{
        background: VIDEO_COLORS.background,
        color: VIDEO_COLORS.text,
        fontFamily: FONT_FAMILY,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(143,153,170,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(143,153,170,0.045) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(circle at center, black 15%, transparent 78%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 850,
          top: -190,
          width: 850,
          height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.13), rgba(139,92,246,0) 68%)',
        }}
      />

      <Sequence from={0} durationInFrames={130} premountFor={30}>
        <div
          style={{
            position: 'absolute',
            left: 126,
            top: 286,
            width: 1320,
            opacity: titleEntrance * titleExit,
            transform: `translateY(${(1 - titleEntrance) * 45}px)`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 25 }}>
            <div style={{ width: 52, height: 2, background: VIDEO_COLORS.violet }} />
            <div
              style={{
                color: VIDEO_COLORS.violetLight,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 3.5,
                textTransform: 'uppercase',
              }}
            >
              Adaptive space-time analysis
            </div>
          </div>
          <h1 style={{ fontSize: 86, lineHeight: 0.98, letterSpacing: -4.8, margin: 0, maxWidth: 1260, fontWeight: 620 }}>
            {heading}
          </h1>
          <p style={{ color: VIDEO_COLORS.textMuted, fontSize: 28, lineHeight: 1.45, margin: '30px 0 0', maxWidth: 960 }}>
            {subtext}
          </p>
        </div>
      </Sequence>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${dashboardScale})`,
          opacity: dashboardDim,
          transformOrigin: 'center center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 64,
            top: 54,
            width: 1792,
            height: 92,
            border: `1px solid ${VIDEO_COLORS.border}`,
            borderRadius: 10,
            background: VIDEO_COLORS.backgroundElevated,
            opacity: dashboardHeaderOpacity,
            padding: '17px 22px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 680 }}>Adaptive Space-Time Cube</div>
            <div style={{ color: VIDEO_COLORS.textMuted, fontSize: 10, marginTop: 5, letterSpacing: 0.5 }}>
              OVERVIEW · PATTERN SUMMARIES · LINKED TEMPORAL ANALYSIS
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              ['WORKFLOW', 'INSPECT', VIDEO_COLORS.violet],
              ['SYNC STATUS', linked ? 'SYNCHRONIZED' : 'READY', linked ? VIDEO_COLORS.green : VIDEO_COLORS.textMuted],
              ['GRANULARITY', 'HOURLY', VIDEO_COLORS.cyan],
            ].map(([label, value, color]) => (
              <div
                key={label}
                style={{
                  width: 178,
                  border: `1px solid ${VIDEO_COLORS.border}`,
                  borderRadius: 6,
                  padding: '8px 11px',
                  background: VIDEO_COLORS.panel,
                }}
              >
                <div style={{ color: VIDEO_COLORS.textMuted, fontSize: 7.5, letterSpacing: 1.3 }}>{label}</div>
                <div style={{ color, fontSize: 10, fontWeight: 700, marginTop: 4 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <ModuleFrame
          title="Spatial overview"
          eyebrow="Chicago incidents"
          role="Spatial role"
          roleDetail="Locate where patterns occur"
          accent={VIDEO_COLORS.cyan}
          enterAt={92}
          assemblyProgress={assemblyProgress}
          isolated={{ x: 116, y: 270, width: 720, height: 430, rotate: -2.2 }}
          assembled={{ x: 64, y: 160, width: 910, height: 490, rotate: 0 }}
        >
          <MapModule selectionProgress={selectionProgress} linked={linked} />
        </ModuleFrame>

        <ModuleFrame
          title="Space-time cube"
          eyebrow="Adaptive time axis"
          role="Spatiotemporal role"
          roleDetail="Inspect how patterns evolve"
          accent={VIDEO_COLORS.amber}
          enterAt={252}
          assemblyProgress={assemblyProgress}
          isolated={{ x: 1085, y: 255, width: 700, height: 430, rotate: 2.4 }}
          assembled={{ x: 986, y: 160, width: 870, height: 490, rotate: 0 }}
        >
          <CubeModule selectionProgress={selectionProgress} linked={linked} />
        </ModuleFrame>

        <ModuleFrame
          title="Dual temporal overview"
          eyebrow="Density and selection"
          role="Temporal role"
          roleDetail="Select when to investigate"
          accent={VIDEO_COLORS.violet}
          enterAt={172}
          assemblyProgress={assemblyProgress}
          isolated={{ x: 410, y: 800, width: 1100, height: 240, rotate: -0.7 }}
          assembled={{ x: 64, y: 666, width: 1792, height: 316, rotate: 0 }}
        >
          <TimelineModule selectionProgress={selectionProgress} linked={linked} />
        </ModuleFrame>

        <SelectionSignal progress={selectionProgress} opacity={interpolate(frame, [555, 590, 725, 760], [0, 1, 1, 0], clamp)} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 500,
          transform: 'translate(-50%, -50%)',
          opacity: assemblyCaptionOpacity,
          padding: '13px 20px',
          border: `1px solid ${VIDEO_COLORS.borderBright}`,
          borderRadius: 8,
          background: 'rgba(7,9,13,0.88)',
          boxShadow: '0 20px 70px rgba(0,0,0,0.5)',
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: -0.5,
        }}
      >
        Three views. <span style={{ color: VIDEO_COLORS.violetLight }}>One coordinated workspace.</span>
      </div>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 506,
          transform: 'translate(-50%, -50%)',
          opacity: linkedCaptionOpacity,
          padding: '13px 20px',
          border: `1px solid rgba(139,92,246,0.7)`,
          borderRadius: 8,
          background: 'rgba(7,9,13,0.9)',
          boxShadow: '0 0 50px rgba(139,92,246,0.22)',
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: -0.5,
        }}
      >
        One temporal selection <span style={{ color: VIDEO_COLORS.violetLight }}>updates every view.</span>
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: closingEntrance,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: 1420,
            padding: '42px 55px 46px',
            border: `1px solid ${VIDEO_COLORS.borderBright}`,
            borderRadius: 16,
            background: 'rgba(7,9,13,0.9)',
            boxShadow: '0 30px 100px rgba(0,0,0,0.7)',
            transform: `translateY(${(1 - closingEntrance) * 35}px)`,
          }}
        >
          <div
            style={{
              color: VIDEO_COLORS.violetLight,
              fontFamily: MONO_FONT,
              fontSize: 12,
              letterSpacing: 2.6,
              textTransform: 'uppercase',
              marginBottom: 19,
            }}
          >
            Research contribution · coordinated analytical workflow
          </div>
          <div style={{ fontSize: 52, lineHeight: 1.08, letterSpacing: -2.6, fontWeight: 620 }}>
            The contribution is a <span style={{ color: VIDEO_COLORS.violetLight }}>workflow</span>,
            <br />not only an axis transformation.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginTop: 26, color: VIDEO_COLORS.textMuted, fontSize: 15 }}>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: VIDEO_COLORS.green, boxShadow: `0 0 14px ${VIDEO_COLORS.green}` }} />
            Timeline, map, and space-time cube remain synchronized around shared temporal selection.
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 42,
          bottom: 30,
          color: VIDEO_COLORS.textMuted,
          fontFamily: MONO_FONT,
          fontSize: 9,
          letterSpacing: 1.3,
          opacity: interpolate(frame, [60, 95], [0, 0.8], clamp),
        }}
      >
        ADAPTIVE SPACE–TIME CUBE · COORDINATED ANALYSIS
      </div>
    </AbsoluteFill>
  );
}
