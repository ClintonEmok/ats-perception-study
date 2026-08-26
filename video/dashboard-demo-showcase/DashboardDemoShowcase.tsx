import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  Box,
  Flame,
  GitCompareArrows,
  Layers3,
  Map,
  MapPin,
} from 'lucide-react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DashboardDemoCompare } from './DashboardDemoCompare';
import { DashboardDemoCube } from './DashboardDemoCube';
import { DashboardDemoMap } from './DashboardDemoMap';
import { DashboardDemoRail } from './DashboardDemoRail';
import { DashboardDemoTimeline } from './DashboardDemoTimeline';
import { DASHBOARD_COLORS } from './palette';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const chapters = [
  { start: 0, end: 7.8, kicker: 'DASHBOARD DEMO', title: 'One workspace, coordinated spatial and temporal evidence', color: DASHBOARD_COLORS.primary },
  { start: 7.8, end: 15.5, kicker: '01 · APPLIED SLICES', title: 'A selected interval becomes a stack of STKDE surfaces', color: DASHBOARD_COLORS.sceneActive },
  { start: 15.5, end: 22.5, kicker: '02 · TEMPORAL EVOLUTION', title: 'Scrubbing the stack exposes how hotspot structure changes', color: DASHBOARD_COLORS.brush },
  { start: 22.5, end: 30.5, kicker: '03 · ADAPTIVE TIME', title: 'Dense periods receive more screen space, not more time or events', color: '#ea580c' },
  { start: 30.5, end: 38.2, kicker: '04 · COMPARE SLICES', title: 'Two slices align on the same sparse spatial grid', color: DASHBOARD_COLORS.chart2 },
  { start: 38.2, end: 45, kicker: '05 · SIGNED DIFFERENCE', title: 'A − B reveals where spatial intensity rises and falls', color: '#b42318' },
] as const;

export function DashboardDemoShowcase() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const at = (value: number) => value * fps;

  const selectionProgress = interpolate(frame, [at(3.4), at(7.4)], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const cubeFade = interpolate(frame, [at(7.6), at(9.2)], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const cubeBuild = interpolate(frame, [at(7.8), at(13.5)], [0.15, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const cubeOrbit = interpolate(frame, [at(8), at(30)], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const topDownProgress = interpolate(frame, [at(15.2), at(17), at(20.5), at(22)], [0, 1, 1, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const scanDayProgress = seconds >= 17 && seconds < 20.6
    ? interpolate(frame, [at(17), at(20.6)], [0, 6.99], clamp)
    : -1;
  const activeSlice = scanDayProgress >= 0 ? Math.min(6, Math.floor(scanDayProgress)) : 3;
  const warpProgress = interpolate(frame, [at(23.4), at(28.7)], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const multiplier = interpolate(warpProgress, [0, 1], [1, 2.5], clamp);
  const compareFade = interpolate(frame, [at(30.2), at(31.8)], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const differenceProgress = interpolate(frame, [at(37.2), at(39.2)], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const currentChapter = chapters.find((chapter) => seconds >= chapter.start && seconds < chapter.end) ?? chapters[chapters.length - 1];
  const chapterLocal = seconds - currentChapter.start;
  const chapterDuration = currentChapter.end - currentChapter.start;
  const chapterOpacity = interpolate(chapterLocal, [0, 0.6, chapterDuration - 0.55, chapterDuration], [0, 1, 1, 0], clamp);
  const chapterY = interpolate(chapterLocal, [0, 0.7], [-8, 0], clamp);
  const activeViewport = compareFade > 0.5 ? 'compare' : cubeFade > 0.5 ? '3d' : 'map';
  const activeTab = activeViewport === 'compare' ? 'compare' : activeViewport === '3d' ? 'inspect' : 'overview';

  return (
    <AbsoluteFill style={{ background: DASHBOARD_COLORS.background, color: DASHBOARD_COLORS.foreground, fontFamily: FONT_FAMILY, overflow: 'hidden' }}>
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        <div style={{ position: 'relative', width: 1600, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <section style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', background: DASHBOARD_COLORS.background }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 1 - compareFade }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 1 - cubeFade }}>
                <DashboardDemoMap selectionProgress={selectionProgress} />
              </div>
              <div style={{ position: 'absolute', inset: 0, opacity: cubeFade }}>
                <DashboardDemoCube
                  selectionProgress={selectionProgress}
                  warpProgress={warpProgress}
                  multiplier={multiplier}
                  cameraProgress={cubeOrbit}
                  buildProgress={cubeBuild}
                  topDownProgress={topDownProgress}
                  scanDayProgress={scanDayProgress}
                />
              </div>
            </div>
            <div style={{ position: 'absolute', inset: 0, opacity: compareFade }}>
              <DashboardDemoCompare differenceProgress={differenceProgress} />
            </div>

            {activeViewport !== 'compare' ? (
              <div style={{ position: 'absolute', left: 16, top: 16, zIndex: 50, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ minWidth: 160, height: 32, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 999, background: 'rgba(255, 255, 255, 0.9)', padding: '0 12px', color: DASHBOARD_COLORS.mutedForeground, fontSize: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', backdropFilter: 'blur(12px)' }}>
                  <span>Demo presets</span><span style={{ fontSize: 9 }}>⌄</span>
                </div>
              </div>
            ) : null}

            <div style={{ position: 'absolute', right: 16, top: 16, zIndex: 50, display: 'flex', alignItems: 'center', gap: 4, border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 999, background: 'rgba(255, 255, 255, 0.9)', padding: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', backdropFilter: 'blur(12px)' }}>
              {[
                ['map', Map],
                ['3d', Box],
                ['compare', GitCompareArrows],
              ].map(([id, Icon]) => (
                <div key={id as string} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: activeViewport === id ? DASHBOARD_COLORS.secondary : 'transparent', color: activeViewport === id ? DASHBOARD_COLORS.foreground : DASHBOARD_COLORS.mutedForeground }}><Icon size={14} /></div>
              ))}
              {activeViewport === 'map' ? (
                <>
                  <div style={{ width: 1, height: 16, background: DASHBOARD_COLORS.border, margin: '0 2px' }} />
                  {[MapPin, Flame, Layers3].map((Icon, index) => <div key={index} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, color: DASHBOARD_COLORS.foreground, background: index > 0 ? DASHBOARD_COLORS.secondary : 'transparent' }}><Icon size={14} /></div>)}
                </>
              ) : null}
            </div>

            <div style={{ position: 'absolute', left: '50%', top: 16, zIndex: 60, opacity: chapterOpacity, transform: `translate(-50%, ${chapterY}px)`, pointerEvents: 'none', minWidth: 470, border: `1px solid ${DASHBOARD_COLORS.border}`, borderRadius: 9, background: 'rgba(255, 255, 255, 0.96)', padding: '7px 18px', textAlign: 'center', boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)', backdropFilter: 'blur(12px)' }}>
              <div style={{ color: currentChapter.color, fontFamily: MONO_FONT, fontSize: 8.5, fontWeight: 800, letterSpacing: 1.8 }}>{currentChapter.kicker}</div>
              <div style={{ marginTop: 2, color: DASHBOARD_COLORS.foreground, fontSize: 12.5, fontWeight: 720 }}>{currentChapter.title}</div>
            </div>
          </section>

          <div style={{ position: 'relative', height: 370, flexShrink: 0, borderTop: `1px solid ${DASHBOARD_COLORS.border}`, background: DASHBOARD_COLORS.card, opacity: 1 - compareFade * 0.12 }}>
            <DashboardDemoTimeline
              selectionProgress={selectionProgress}
              warpProgress={warpProgress}
              multiplier={multiplier}
              highlightDensity={seconds >= 2.2 && seconds < 7.8}
              highlightDetail={seconds >= 22.5 && seconds < 30.5}
            />
          </div>
        </div>
        <div style={{ width: 320, height: '100%', flexShrink: 0 }}>
          <DashboardDemoRail activeTab={activeTab} warpProgress={warpProgress} multiplier={multiplier} activeSlice={activeSlice} />
        </div>
      </div>

      <div style={{ position: 'absolute', left: 18, bottom: 12, zIndex: 80, color: DASHBOARD_COLORS.mutedForeground, fontFamily: MONO_FONT, fontSize: 8, letterSpacing: 1.2 }}>
        CHICAGO CRIME RECORDS · 28 JUL–4 AUG 2025 · 5,152 EVENTS
      </div>
      <div style={{ position: 'absolute', right: 334, bottom: 12, zIndex: 80, color: DASHBOARD_COLORS.mutedForeground, fontFamily: MONO_FONT, fontSize: 8, letterSpacing: 1.2 }}>
        ADAPTIVE SPACE–TIME CUBE
      </div>
    </AbsoluteFill>
  );
}
