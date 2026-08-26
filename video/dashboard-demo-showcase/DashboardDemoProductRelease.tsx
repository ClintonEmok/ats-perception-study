import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Activity, ArrowUpRight, Box, Map, ScanLine } from 'lucide-react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DashboardDemoCube } from './DashboardDemoCube';
import { DashboardDemoMap } from './DashboardDemoMap';
import { DashboardDemoRail } from './DashboardDemoRail';
import { DashboardDemoTimeline } from './DashboardDemoTimeline';
import { DASHBOARD_COLORS, DENSITY_GRADIENT } from './palette';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const sceneOpacity = (seconds: number, start: number, end: number, fade = 0.8): number =>
  interpolate(seconds, [start, start + fade, end - fade, end], [0, 1, 1, 0], clamp);

function FilmGrid() {
  return (
    <AbsoluteFill
      style={{
        opacity: 0.28,
        backgroundImage:
          'linear-gradient(oklch(0.922 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.922 0 0) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }}
    />
  );
}

function ReleaseChrome({ seconds }: { seconds: number }) {
  const progress = Math.min(1, Math.max(0, seconds / 54));
  return (
    <>
      <div style={{ position: 'absolute', left: 40, top: 30, zIndex: 100, display: 'flex', alignItems: 'center', gap: 10, color: DASHBOARD_COLORS.foreground }}>
        <div style={{ width: 9, height: 9, borderRadius: 99, background: DASHBOARD_COLORS.sceneActive }} />
        <span style={{ fontFamily: MONO_FONT, fontSize: 10, fontWeight: 800, letterSpacing: 2 }}>ADAPTIVE SPACE–TIME CUBE</span>
      </div>
      <div style={{ position: 'absolute', right: 40, top: 30, zIndex: 100, color: DASHBOARD_COLORS.mutedForeground, fontFamily: MONO_FONT, fontSize: 9, letterSpacing: 1.5 }}>
        PRODUCT FILM · 2026
      </div>
      <div style={{ position: 'absolute', left: 40, right: 40, bottom: 24, zIndex: 100 }}>
        <div style={{ height: 1, background: DASHBOARD_COLORS.border }}>
          <div style={{ width: `${progress * 100}%`, height: 2, background: DASHBOARD_COLORS.foreground }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: DASHBOARD_COLORS.mutedForeground, fontFamily: MONO_FONT, fontSize: 8, letterSpacing: 1 }}>
          <span>01 TIME</span><span>02 PLACE</span><span>03 DEPTH</span><span>04 COORDINATION</span><span>05 RELEASE</span>
        </div>
      </div>
    </>
  );
}

function SceneCopy({
  index,
  eyebrow,
  title,
  body,
  opacity,
  x = 86,
  y = 130,
  width = 560,
  light = false,
}: {
  index: string;
  eyebrow: string;
  title: string;
  body: string;
  opacity: number;
  x?: number;
  y?: number;
  width?: number;
  light?: boolean;
}) {
  const foreground = light ? '#ffffff' : DASHBOARD_COLORS.foreground;
  const muted = light ? 'rgba(255,255,255,0.68)' : DASHBOARD_COLORS.mutedForeground;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width, zIndex: 70, opacity, color: foreground }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: muted, fontFamily: MONO_FONT, fontSize: 10, fontWeight: 750, letterSpacing: 2 }}>
        <span>{index}</span><span style={{ width: 44, height: 1, background: muted }} /><span>{eyebrow}</span>
      </div>
      <div style={{ marginTop: 18, fontSize: 58, lineHeight: 0.98, fontWeight: 820, letterSpacing: -2.7 }}>{title}</div>
      <div style={{ marginTop: 20, maxWidth: 470, color: muted, fontSize: 17, lineHeight: 1.55 }}>{body}</div>
    </div>
  );
}

function AdaptiveControl({ progress, opacity }: { progress: number; opacity: number }) {
  return (
    <div style={{ position: 'absolute', right: 120, top: 145, zIndex: 60, width: 260, opacity, border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 12, background: 'rgba(255,255,255,0.94)', padding: 16, boxShadow: '0 18px 44px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}><span>Time scale</span><span style={{ border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 5, background: DASHBOARD_COLORS.secondary, padding: '5px 9px', fontSize: 10 }}>Adaptive</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, fontSize: 10 }}>
        <span>Warp factor</span>
        <div style={{ position: 'relative', height: 5, flex: 1, borderRadius: 99, background: DASHBOARD_COLORS.muted }}><div style={{ width: `${progress * 72}%`, height: '100%', borderRadius: 99, background: DASHBOARD_COLORS.primary }} /><div style={{ position: 'absolute', left: `${progress * 72}%`, top: '50%', width: 12, height: 12, transform: 'translate(-50%,-50%)', borderRadius: 99, background: '#ffffff', border: `2px solid ${DASHBOARD_COLORS.primary}` }} /></div>
        <span style={{ width: 32, textAlign: 'right', fontFamily: MONO_FONT }}>{Math.round(progress * 72)}%</span>
      </div>
      <div style={{ height: 9, marginTop: 16, borderRadius: 99, background: DENSITY_GRADIENT }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, color: DASHBOARD_COLORS.mutedForeground, fontFamily: MONO_FONT, fontSize: 8 }}><span>SPARSE</span><span>DENSE</span></div>
    </div>
  );
}

function TimelineReleaseScene({ frame, fps, seconds }: { frame: number; fps: number; seconds: number }) {
  const opacity = sceneOpacity(seconds, 1.2, 14.2, 1);
  const local = seconds - 1.2;
  const entry = spring({ frame: frame - 1.2 * fps, fps, config: { damping: 18, stiffness: 85, mass: 1.1 }, durationInFrames: 2.2 * fps });
  const selection = interpolate(local, [2.2, 5.2], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const warp = interpolate(local, [4.5, 9.5], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const tilt = interpolate(entry, [0, 1], [52, 7]);
  const rotateZ = interpolate(entry, [0, 1], [-3.5, -0.5]);
  const scale = interpolate(local, [0, 6, 11.5], [1.12, 1.02, 0.93], clamp);
  const copyOpacity = interpolate(local, [0.4, 1.4, 10.8, 12], [0, 1, 1, 0], clamp);

  return (
    <AbsoluteFill style={{ opacity, overflow: 'hidden' }}>
      <SceneCopy index="01" eyebrow="ADAPTIVE TIME" title="TIME, GIVEN THE SPACE IT NEEDS." body="Dense intervals expand. Sparse intervals compress. Chronology, event counts, and analytical boundaries remain intact." opacity={copyOpacity} />
      <AdaptiveControl progress={warp} opacity={interpolate(local, [3.4, 4.4, 10.2, 11.2], [0, 1, 1, 0], clamp)} />
      <div style={{ position: 'absolute', left: 70, top: 510, width: 1780, height: 420, transformOrigin: '50% 100%', transform: `perspective(1800px) rotateX(${tilt}deg) rotateZ(${rotateZ}deg) scale(${scale})`, border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 14, overflow: 'hidden', background: DASHBOARD_COLORS.card, boxShadow: '0 45px 90px rgba(0,0,0,0.15)' }}>
        <div style={{ width: 1600, height: 370, transform: 'scale(1.1125)', transformOrigin: 'top left' }}>
          <DashboardDemoTimeline selectionProgress={selection} warpProgress={warp} multiplier={interpolate(warp, [0, 1], [1, 2.5])} highlightDensity={warp < 0.45} highlightDetail={warp >= 0.45} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

function MapReleaseScene({ frame, fps, seconds }: { frame: number; fps: number; seconds: number }) {
  const opacity = sceneOpacity(seconds, 13, 24, 0.9);
  const local = seconds - 13;
  const entry = spring({ frame: frame - 13 * fps, fps, config: { damping: 17, stiffness: 75, mass: 1.1 }, durationInFrames: 2.4 * fps });
  const selection = interpolate(local, [3, 7.5], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const rotateY = interpolate(entry, [0, 1], [18, -3]);
  const rotateX = interpolate(entry, [0, 1], [7, 1]);
  const panX = interpolate(local, [0, 10], [-96, -62], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const panY = interpolate(local, [0, 10], [-4, -18], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const zoom = interpolate(local, [0, 10], [1.02, 1.09], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const copyOpacity = interpolate(local, [0.4, 1.3, 8.7, 9.8], [0, 1, 1, 0], clamp);

  return (
    <AbsoluteFill style={{ opacity, overflow: 'hidden' }}>
      <SceneCopy index="02" eyebrow="GEOGRAPHIC CONTEXT" title="THE PATTERN, GROUNDED." body="Real Chicago incidents remain geographically legible while a temporal selection brings one interval into focus." opacity={copyOpacity} x={86} y={135} width={500} />
      <div style={{ position: 'absolute', left: 580, top: 115, width: 1420, height: 800, transformOrigin: '50% 50%', transform: `perspective(1800px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`, border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 16, overflow: 'hidden', background: '#ffffff', boxShadow: '0 45px 90px rgba(0,0,0,0.17)' }}>
        <div style={{ width: 1600, height: 710, transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: '50% 48%' }}><DashboardDemoMap selectionProgress={selection} /></div>
        <div style={{ position: 'absolute', left: 18, bottom: 18, display: 'flex', gap: 8 }}>
          {[['5,152', 'EVENTS'], ['7 DAYS', 'WINDOW'], ['25', 'DISTRICTS']].map(([value, label]) => <div key={label} style={{ border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 7, background: 'rgba(255,255,255,0.92)', padding: '8px 11px' }}><div style={{ fontSize: 13, fontWeight: 800 }}>{value}</div><div style={{ marginTop: 2, color: DASHBOARD_COLORS.mutedForeground, fontFamily: MONO_FONT, fontSize: 7, letterSpacing: 1.2 }}>{label}</div></div>)}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function CubeReleaseScene({ frame, fps, seconds }: { frame: number; fps: number; seconds: number }) {
  const opacity = sceneOpacity(seconds, 22.8, 36.2, 0.9);
  const local = seconds - 22.8;
  const entry = spring({ frame: frame - 22.8 * fps, fps, config: { damping: 18, stiffness: 76, mass: 1.2 }, durationInFrames: 2.6 * fps });
  const build = interpolate(local, [0.6, 5.2], [0.15, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const orbit = interpolate(local, [0, 12], [0, 1], clamp);
  const topDown = interpolate(local, [6.2, 8.2, 10, 11.8], [0, 1, 1, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const sliceEvolution = interpolate(local, [8.15, 13.15], [0, 6.99], clamp);
  const rotateY = interpolate(entry, [0, 1], [-20, 1.5]);
  const rotateX = interpolate(entry, [0, 1], [5, 0]);
  const copyOpacity = interpolate(local, [0.5, 1.5, 11, 12], [0, 1, 1, 0], clamp);

  return (
    <AbsoluteFill style={{ opacity, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: DASHBOARD_COLORS.scene }} />
      <SceneCopy index="03" eyebrow="SPATIOTEMPORAL DEPTH" title="THE PATTERN, IN MOTION." body="STKDE surfaces stack through time. Orbit the same structure, then tilt overhead to reveal persistent and shifting hotspots." opacity={copyOpacity} x={92} y={150} width={510} />
      <div style={{ position: 'absolute', left: 560, top: 90, width: 1440, height: 850, transformOrigin: '50% 55%', transform: `perspective(1700px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`, overflow: 'hidden' }}>
        <div style={{ width: 1600, height: 710, transform: 'scale(1.12)', transformOrigin: 'center center' }}>
           <DashboardDemoCube selectionProgress={1} warpProgress={0.6} multiplier={1.9} cameraProgress={orbit} buildProgress={build} topDownProgress={topDown} scanDayProgress={-1} sliceEvolutionProgress={local >= 8.15 && local <= 13.15 ? sliceEvolution : -1} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

function AssemblyScene({ frame, fps, seconds }: { frame: number; fps: number; seconds: number }) {
  const opacity = sceneOpacity(seconds, 35, 49.3, 0.9);
  const local = seconds - 35;
  const assembly = spring({ frame: frame - 35 * fps, fps, config: { damping: 19, stiffness: 72, mass: 1.2 }, durationInFrames: 3.2 * fps });
  const mapToCube = interpolate(local, [6.4, 8.2], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const warp = interpolate(local, [4, 8.5], [0.15, 0.82], clamp);
  const copyOpacity = interpolate(local, [1.7, 2.8, 10.8, 12.2], [0, 1, 1, 0], clamp);
  const dashboardScale = interpolate(assembly, [0, 1], [0.83, 0.96]);
  const dashboardTilt = interpolate(assembly, [0, 1], [7, 0]);
  const timelineY = interpolate(assembly, [0, 1], [180, 0]);
  const railX = interpolate(assembly, [0, 1], [210, 0]);
  const viewportX = interpolate(assembly, [0, 1], [-150, 0]);

  return (
    <AbsoluteFill style={{ opacity, overflow: 'hidden' }}>
      <SceneCopy index="04" eyebrow="COORDINATED WORKSPACE" title="ONE SELECTION. EVERY VIEW." body="The map, cube, adaptive timeline, and analytical controls resolve into one synchronized workspace." opacity={copyOpacity} x={72} y={92} width={560} />
      <div style={{ position: 'absolute', left: '50%', top: 180, width: 1920, height: 1080, transformOrigin: '50% 60%', transform: `translateX(-50%) perspective(2200px) rotateX(${dashboardTilt}deg) scale(${dashboardScale})`, border: `1px solid ${DASHBOARD_COLORS.border}`, background: DASHBOARD_COLORS.background, boxShadow: '0 50px 110px rgba(0,0,0,0.17)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
          <div style={{ width: 1600, display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', height: 710, overflow: 'hidden', transform: `translateX(${viewportX}px)` }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 1 - mapToCube }}><DashboardDemoMap selectionProgress={1} /></div>
              <div style={{ position: 'absolute', inset: 0, opacity: mapToCube }}><DashboardDemoCube selectionProgress={1} warpProgress={warp} multiplier={2.2} cameraProgress={0.8} buildProgress={1} topDownProgress={0} scanDayProgress={-1} /></div>
              <div style={{ position: 'absolute', right: 18, top: 18, display: 'flex', gap: 5, border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 999, background: 'rgba(255,255,255,0.92)', padding: 5 }}>
                {[Map, Box, ScanLine].map((Icon, index) => <div key={index} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 99, background: (mapToCube < 0.5 ? index === 0 : index === 1) ? DASHBOARD_COLORS.secondary : 'transparent' }}><Icon size={14} /></div>)}
              </div>
            </div>
            <div style={{ height: 370, transform: `translateY(${timelineY}px)`, borderTop: `1px solid ${DASHBOARD_COLORS.border}` }}><DashboardDemoTimeline selectionProgress={1} warpProgress={warp} multiplier={2.2} highlightDensity={false} highlightDetail /></div>
          </div>
          <div style={{ width: 320, transform: `translateX(${railX}px)` }}><DashboardDemoRail activeTab="inspect" warpProgress={warp} multiplier={2.2} activeSlice={3} /></div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function ReleaseLockup({ frame, fps, seconds }: { frame: number; fps: number; seconds: number }) {
  const opacity = interpolate(seconds, [47.6, 49, 53.5, 54], [0, 1, 1, 0], clamp);
  const reveal = spring({ frame: frame - 48 * fps, fps, config: { damping: 20, stiffness: 70, mass: 1 }, durationInFrames: 2.2 * fps });
  return (
    <AbsoluteFill style={{ opacity, background: DASHBOARD_COLORS.foreground, color: '#ffffff', zIndex: 90 }}>
      <div style={{ position: 'absolute', left: 92, top: 120, fontFamily: MONO_FONT, fontSize: 10, fontWeight: 750, letterSpacing: 2.4, color: 'rgba(255,255,255,0.58)' }}>ADAPTIVE SPACE–TIME CUBE · PRODUCT RELEASE</div>
      <div style={{ position: 'absolute', left: 92, bottom: 150, width: 1420, transform: `translateY(${interpolate(reveal, [0, 1], [55, 0])}px)`, opacity: reveal }}>
        <div style={{ fontSize: 112, lineHeight: 0.9, fontWeight: 850, letterSpacing: -7 }}>SEE TIME<br />DIFFERENTLY.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 34, color: 'rgba(255,255,255,0.7)', fontSize: 20 }}><span>Explore density</span><span>·</span><span>Compare slices</span><span>·</span><span>Follow change through space</span></div>
      </div>
      <div style={{ position: 'absolute', right: 92, bottom: 150, width: 210, height: 210, borderRadius: 999, border: '1px solid rgba(255,255,255,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ArrowUpRight size={70} strokeWidth={1.15} />
      </div>
    </AbsoluteFill>
  );
}

export function DashboardDemoProductRelease() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const introReveal = spring({ frame, fps, config: { damping: 18, stiffness: 68, mass: 1 }, durationInFrames: 1.7 * fps });
  const introOpacity = interpolate(seconds, [0, 0.35, 1.4, 2.1], [0, 1, 1, 0], clamp);

  return (
    <AbsoluteFill style={{ background: '#f7f5f0', color: DASHBOARD_COLORS.foreground, fontFamily: FONT_FAMILY, overflow: 'hidden' }}>
      <FilmGrid />
      <TimelineReleaseScene frame={frame} fps={fps} seconds={seconds} />
      <MapReleaseScene frame={frame} fps={fps} seconds={seconds} />
      <CubeReleaseScene frame={frame} fps={fps} seconds={seconds} />
      <AssemblyScene frame={frame} fps={fps} seconds={seconds} />
      <ReleaseLockup frame={frame} fps={fps} seconds={seconds} />

      <div style={{ position: 'absolute', inset: 0, zIndex: 80, opacity: introOpacity, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ textAlign: 'center', transform: `translateY(${interpolate(introReveal, [0, 1], [25, 0])}px)`, opacity: introReveal }}>
          <Activity size={30} strokeWidth={1.4} style={{ margin: '0 auto 22px', color: DASHBOARD_COLORS.sceneActive }} />
          <div style={{ fontFamily: MONO_FONT, fontSize: 10, fontWeight: 800, letterSpacing: 2.8, color: DASHBOARD_COLORS.mutedForeground }}>INTRODUCING</div>
          <div style={{ marginTop: 14, fontSize: 70, lineHeight: 0.95, fontWeight: 850, letterSpacing: -4 }}>ADAPTIVE<br />SPACE–TIME CUBE</div>
        </div>
      </div>

      {seconds < 48 ? <ReleaseChrome seconds={seconds} /> : null}
    </AbsoluteFill>
  );
}
