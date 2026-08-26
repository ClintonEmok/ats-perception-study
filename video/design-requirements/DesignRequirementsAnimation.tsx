import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { AnalyticalTasksColumn } from './AnalyticalTasksColumn';
import { ConvergenceStreams } from './ConvergenceStreams';
import { DataPropertiesColumn } from './DataPropertiesColumn';
import { DESIGN_COLORS } from './data';
import { DesignGoalsRow } from './DesignGoalsRow';
import { DesignRequirementsGrid } from './DesignRequirementsGrid';
import { VisualizationPrinciplesColumn } from './VisualizationPrinciplesColumn';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const DesignRequirementsAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clamp effective frame at 330 (11.0s) for 100% static hold until end of presentation
  const effectiveFrame = Math.min(frame, 330);

  // Header entrance
  const headerSpring = spring({
    frame: effectiveFrame,
    fps,
    config: { damping: 18, stiffness: 120 },
  });
  const headerOpacity = interpolate(headerSpring, [0, 1], [0, 1], clamp);
  const headerY = interpolate(headerSpring, [0, 1], [-18, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        fontFamily: FONT_FAMILY,
        color: DESIGN_COLORS.textPrimary,
        padding: '0 50px',
      }}
    >
      {/* Subtle Background Grid Pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(15, 23, 42, 0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.028) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }}
      />

      {/* ==================================================== */}
      {/* 1. TOP HEADER (Slide 15 - Traceability Framework)     */}
      {/* ==================================================== */}
      <header
        style={{
          width: 1820,
          marginTop: 22,
          marginBottom: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
          zIndex: 20,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: -1.2,
              color: DESIGN_COLORS.textPrimary,
              lineHeight: 1.05,
            }}
          >
            Deriving the Design Requirements
          </h1>
        </div>

        <div
          style={{
            maxWidth: 740,
            fontSize: 15,
            fontWeight: 600,
            color: DESIGN_COLORS.textSecondary,
            textAlign: 'right',
            lineHeight: 1.35,
          }}
        >
          Three foundational inputs systematically converge into <span style={{ color: '#0d9488', fontWeight: 850 }}>5 design goals</span> and <span style={{ color: '#4f46e5', fontWeight: 850 }}>6 concrete requirements</span>.
        </div>
      </header>

      {/* ==================================================== */}
      {/* 2. SVG CONVERGENCE CONNECTOR STREAMS                 */}
      {/* ==================================================== */}
      <ConvergenceStreams
        stream1StartFrame={175}
        stream2StartFrame={245}
      />

      {/* ==================================================== */}
      {/* 3. TIER 1: THREE INPUT STREAMS (Top ~40%)            */}
      {/* ==================================================== */}
      <div
        style={{
          width: 1820,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10,
          marginTop: 4,
          marginBottom: 44,
        }}
      >
        {/* Stream 01: ANALYTICAL TASKS (0:00 - 0:02 / Frames 5-60) */}
        <AnalyticalTasksColumn startFrame={5} />

        {/* Stream 02: DATA PROPERTIES (0:02 - 0:04 / Frames 60-120) */}
        <DataPropertiesColumn startFrame={60} />

        {/* Stream 03: VISUALIZATION PRINCIPLES (0:04 - 0:06 / Frames 120-180) */}
        <VisualizationPrinciplesColumn startFrame={120} />
      </div>

      {/* ==================================================== */}
      {/* 4. TIER 2: DESIGN GOALS (0:06 - 0:08 / Frames 185+)  */}
      {/* ==================================================== */}
      <div style={{ marginBottom: 44, zIndex: 10 }}>
        <DesignGoalsRow startFrame={185} />
      </div>

      {/* ==================================================== */}
      {/* 5. TIER 3: DESIGN REQUIREMENTS (0:08 - 0:11 / 255+)  */}
      {/* ==================================================== */}
      <div style={{ zIndex: 10 }}>
        <DesignRequirementsGrid startFrame={255} />
      </div>
    </AbsoluteFill>
  );
};
