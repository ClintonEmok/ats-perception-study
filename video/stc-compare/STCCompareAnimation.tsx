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
import { DashboardDemoCube } from '../dashboard-demo-showcase/DashboardDemoCube';
import { CompareTimelineView } from './CompareTimelineView';
import { DASHBOARD_COLORS } from '../dashboard-demo-showcase/palette';
import { CompareSidebarRail } from './CompareSidebarRail';
import { CompareStageView } from './CompareStageView';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const bezierEase = Easing.bezier(0.16, 1, 0.3, 1);

const WORKFLOW_STEPS = [
  { id: 'overview', label: 'OVERVIEW', active: false, completed: true },
  { id: 'select', label: 'SELECT', active: false, completed: true },
  { id: 'inspect', label: 'INSPECT', active: false, completed: true },
  { id: 'compare', label: 'COMPARE', active: true, completed: false },
];

export const STCCompareAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;

  // ==========================================================
  // SCENE CHOREOGRAPHY (1260 Frames / 42s @ 30fps)
  // ==========================================================

  // Scene 1: 0s–7s (0–210f): 3D STC Inspection & Evolution
  // Scene 2: 7s–15s (210–450f): Switch to Compare & Select Slices in Sidebar
  const compareFade = interpolate(frame, [210, 260], [0, 1], {
    easing: bezierEase,
    ...clamp,
  });

  // Scene 3: 15s–23s (450–690f): Side-by-Side Heatmaps + Delta Bars
  // Scene 4: 23s–33s (690–990f): Activate [Show A − B difference] Toggle
  const differenceProgress = interpolate(frame, [690, 760], [0, 1], {
    easing: bezierEase,
    ...clamp,
  });

  // Cube Orbit & Evolution Scrubbing parameters for Scene 1
  const cubeOrbit = interpolate(frame, [0, 210], [0.1, 0.35], clamp);
  const scanDayProgress = interpolate(frame, [30, 180], [1.5, 3.8], clamp);
  const activeViewport = compareFade > 0.5 ? 'compare' : '3d';
  const activeTab = compareFade > 0.4 ? 'compare' : 'inspect';

  // Dynamic Scene Subtitle / Speaker Cue
  const getSceneNarration = () => {
    if (frame < 210) {
      return {
        label: 'SCENE 1 · CONTINUITY: 3D TEMPORAL INSPECTION',
        desc: 'While inspecting temporal evolution in 3D, multiple distinct states are identified across the time stack.',
      };
    }
    if (frame < 450) {
      return {
        label: 'SCENE 2 · SELECTION: PAIRING COMMITTED SLICES IN SIDEBAR',
        desc: 'Instead of losing previous states when exploration moves forward, the analyst pairs them in the comparison slots.',
      };
    }
    if (frame < 690) {
      return {
        label: 'SCENE 3 · SIDE-BY-SIDE: SPATIAL DISTRIBUTIONS ON SHARED GRID',
        desc: 'The two slices align on a shared spatial grid, enabling direct visual and quantitative comparison.',
      };
    }
    if (frame < 990) {
      return {
        label: 'SCENE 4 · SIGNED DIFFERENCE: ISOLATING SPATIAL SHIFTS',
        desc: 'Toggling the signed difference immediately reveals spatial change — isolating where incident intensity rose or fell.',
      };
    }
    return {
      label: 'SCENE 5 · ANALYTICAL CLOSURE: COMPLETE WORKFLOW',
      desc: 'Together, Overview, Selection, Inspection, and Comparison form the complete analytical workflow.',
    };
  };

  const narration = getSceneNarration();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: DASHBOARD_COLORS.background,
        color: DASHBOARD_COLORS.foreground,
        fontFamily: FONT_FAMILY,
        overflow: 'hidden',
      }}
    >
      {/* Background Subtle Grid Pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(15, 23, 42, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15, 23, 42, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      {/* ==================================================== */}
      {/* 1. TOP HEADER & WORKFLOW STEPPER INDICATOR           */}
      {/* ==================================================== */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 36,
          right: 36,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          zIndex: 80,
        }}
      >
        <div>
          {/* Workflow Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 999,
                background: '#ffffff',
                border: `1px solid ${DASHBOARD_COLORS.border}`,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
              }}
            >
              {WORKFLOW_STEPS.map((step, idx) => {
                const isLast = idx === WORKFLOW_STEPS.length - 1;
                return (
                  <React.Fragment key={step.id}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: step.active
                          ? 'rgba(124, 58, 237, 0.1)'
                          : 'transparent',
                        border: step.active
                          ? '1px solid rgba(124, 58, 237, 0.3)'
                          : '1px solid transparent',
                      }}
                    >
                      <div
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          backgroundColor: step.active ? '#7c3aed' : 'rgba(15, 23, 42, 0.4)',
                        }}
                      />
                      <span
                        style={{
                          fontFamily: MONO_FONT,
                          fontSize: 10,
                          fontWeight: step.active ? 850 : 650,
                          letterSpacing: 1.1,
                          color: step.active ? '#7c3aed' : 'rgba(15, 23, 42, 0.55)',
                        }}
                      >
                        {step.label}
                      </span>
                    </div>
                    {!isLast && (
                      <span
                        style={{
                          color: 'rgba(15, 23, 42, 0.25)',
                          fontSize: 10,
                          fontWeight: 700,
                          fontFamily: MONO_FONT,
                        }}
                      >
                        →
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <div
              style={{
                fontFamily: MONO_FONT,
                fontSize: 10.5,
                fontWeight: 850,
                color: '#0f172a',
                letterSpacing: 1.1,
                opacity: 0.85,
              }}
            >
              {narration.label}
            </div>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: -0.6,
            }}
          >
            Dashboard Demo — Compare Slices
          </h1>
        </div>

        {/* Top-Right Narration Pill */}
        <div
          style={{
            maxWidth: 620,
            textAlign: 'right',
            fontSize: 12,
            fontWeight: 650,
            color: '#0f172a',
            lineHeight: 1.4,
            opacity: 0.9,
          }}
        >
          {narration.desc.split('—').map((part, idx) => (
            <span key={idx}>
              {idx > 0 && ' — '}
              {part.includes('signed difference') ||
              part.includes('paired') ||
              part.includes('complete') ? (
                <span style={{ color: '#7c3aed', fontWeight: 800 }}>{part}</span>
              ) : (
                part
              )}
            </span>
          ))}
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. MAIN DASHBOARD WORKSPACE (Viewport + Sidebar)     */}
      {/* ==================================================== */}
      <div
        style={{
          position: 'absolute',
          left: 36,
          right: 36,
          top: 76,
          bottom: 24,
          display: 'flex',
          borderRadius: 12,
          overflow: 'hidden',
          border: `1.5px solid ${DASHBOARD_COLORS.border}`,
          boxShadow: '0 16px 48px rgba(15, 23, 42, 0.08)',
          backgroundColor: DASHBOARD_COLORS.background,
        }}
      >
        {/* Left/Center Area: Shared Viewport & Bottom Timeline */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top Viewport Area */}
          <section
            style={{
              position: 'relative',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              background: DASHBOARD_COLORS.background,
            }}
          >
            {/* 3D Cube View (Scene 1) */}
            <div style={{ position: 'absolute', inset: 0, opacity: 1 - compareFade }}>
              <DashboardDemoCube
                selectionProgress={1}
                warpProgress={1}
                multiplier={2.2}
                cameraProgress={cubeOrbit}
                buildProgress={1}
                topDownProgress={0}
                scanDayProgress={scanDayProgress}
              />
            </div>

            {/* Compare Stage View (Scenes 2–5) */}
            <div style={{ position: 'absolute', inset: 0, opacity: compareFade }}>
              <CompareStageView differenceProgress={differenceProgress} />
            </div>

            {/* Top-Right Viewport Switcher Controls */}
            <div
              style={{
                position: 'absolute',
                right: 16,
                top: 14,
                zIndex: 60,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                border: `1px solid ${DASHBOARD_COLORS.border}`,
                borderRadius: 999,
                background: 'rgba(255, 255, 255, 0.94)',
                padding: 4,
                boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {[
                ['map', Map],
                ['3d', Box],
                ['compare', GitCompareArrows],
              ].map(([id, Icon]) => {
                const isActive = activeViewport === id;
                return (
                  <div
                    key={id as string}
                    style={{
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 999,
                      background: isActive ? (id === 'compare' ? 'rgba(124, 58, 237, 0.12)' : DASHBOARD_COLORS.secondary) : 'transparent',
                      color: isActive ? (id === 'compare' ? '#7c3aed' : DASHBOARD_COLORS.foreground) : DASHBOARD_COLORS.mutedForeground,
                      border: isActive && id === 'compare' ? '1px solid rgba(124, 58, 237, 0.3)' : 'none',
                    }}
                  >
                    <Icon size={14} />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Bottom Coordinated Dual Timeline with Multiple Slices */}
          <div
            style={{
              position: 'relative',
              height: 280,
              flexShrink: 0,
              borderTop: `1px solid ${DASHBOARD_COLORS.border}`,
              background: DASHBOARD_COLORS.card,
            }}
          >
            <CompareTimelineView
              warpProgress={1}
              multiplier={2.2}
              activeComparisonPhase={compareFade}
            />
          </div>
        </div>

        {/* Right Area: Dedicated Sidebar Rail */}
        <div style={{ width: 350, height: '100%', flexShrink: 0 }}>
          <CompareSidebarRail activeTab={activeTab} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
