import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { CANVAS_HEIGHT, CANVAS_WIDTH, DARK_TEXT, DBTA_STEPS, MUTED_TEXT, TUE_RED } from './data';
import { StepCard } from './StepCard';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const DBTAAlgorithmAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clamp effective frame at 900 (30.0s) for 100% static stillness for the remaining 30s
  const effectiveFrame = Math.min(frame, 900);

  // -------------------------------------------------------------------------
  // Narrative Pacing:
  // Phase 0 (0..150 / 0.0s..5.0s): Introduction & Overview (all cards visible)
  // Phase 1 (150..330 / 5.0s..11.0s): Step 1 - Temporal Partitioning
  // Phase 2 (330..510 / 11.0s..17.0s): Step 2 - Density Estimation
  // Phase 3 (510..690 / 17.0s..23.0s): Step 3 - Weight Allocation
  // Phase 4 (690..870 / 23.0s..29.0s): Step 4 - Coordinate Integration
  // Phase 5 (870..1800 / 29.0s..60.0s): Synthesis Architecture (All Illuminated)
  // -------------------------------------------------------------------------

  const isOverview = effectiveFrame < 150;
  const isStep1 = effectiveFrame >= 150 && effectiveFrame < 330;
  const isStep2 = effectiveFrame >= 330 && effectiveFrame < 510;
  const isStep3 = effectiveFrame >= 510 && effectiveFrame < 690;
  const isStep4 = effectiveFrame >= 690 && effectiveFrame < 870;
  const isSynthesis = effectiveFrame >= 870;

  // Activation progress per step (0 to 1)
  const act1 = interpolate(effectiveFrame, [150, 180, 305, 330], [0, 1, 1, 0], clamp);
  const act2 = interpolate(effectiveFrame, [330, 360, 485, 510], [0, 1, 1, 0], clamp);
  const act3 = interpolate(effectiveFrame, [510, 540, 665, 690], [0, 1, 1, 0], clamp);
  const act4 = interpolate(effectiveFrame, [690, 720, 845, 870], [0, 1, 1, 0], clamp);

  const activationValues = [
    isSynthesis ? 1 : isStep1 ? act1 : isOverview ? 0.3 : 0,
    isSynthesis ? 1 : isStep2 ? act2 : isOverview ? 0.3 : 0,
    isSynthesis ? 1 : isStep3 ? act3 : isOverview ? 0.3 : 0,
    isSynthesis ? 1 : isStep4 ? act4 : isOverview ? 0.3 : 0,
  ];

  const activeBooleans = [
    isSynthesis || isStep1,
    isSynthesis || isStep2,
    isSynthesis || isStep3,
    isSynthesis || isStep4,
  ];

  const dimmedBooleans = [
    !isOverview && !isSynthesis && !isStep1,
    !isOverview && !isSynthesis && !isStep2,
    !isOverview && !isSynthesis && !isStep3,
    !isOverview && !isSynthesis && !isStep4,
  ];

  // Card dimensions
  const cardWidth = 370;
  const cardHeight = 560;
  const cardGap = 38;
  const totalGridWidth = 4 * cardWidth + 3 * cardGap; // 1480 + 114 = 1594px
  const startX = (CANVAS_WIDTH - totalGridWidth) / 2; // ~163px
  const startY = 270;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        position: 'relative',
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* ---------------------------------------------------- */}
      {/* 1. TOP HEADER                                        */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          marginTop: 80,
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 30,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 48,
            fontWeight: 900,
            color: DARK_TEXT,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          {isStep1
            ? 'STEP 1 · TEMPORAL PARTITIONING'
            : isStep2
            ? 'STEP 2 · DENSITY ESTIMATION'
            : isStep3
            ? 'STEP 3 · WEIGHT ALLOCATION'
            : isStep4
            ? 'STEP 4 · COORDINATE INTEGRATION'
            : 'DBTA ALGORITHM PIPELINE'}
        </h1>

        <p
          style={{
            margin: '10px 0 0 0',
            fontSize: 22,
            fontWeight: 600,
            color: isOverview || isSynthesis ? DARK_TEXT : MUTED_TEXT,
            letterSpacing: -0.2,
          }}
        >
          {isStep1 ? (
            'Fixed reference intervals preserve chronological identity and temporal boundaries'
          ) : isStep2 ? (
            'Continuous density measurement quantifies burstiness without modifying time bounds'
          ) : isStep3 ? (
            'Power scaling with a strict non-zero floor guarantees sparse periods never disappear'
          ) : isStep4 ? (
            'Prefix-sum integration produces monotonic visual coordinates across fixed extent W'
          ) : (
            <span>
              Four deterministic stages from <strong style={{ color: DARK_TEXT, fontWeight: 800 }}>raw event streams</strong> to <strong style={{ color: '#2563eb', fontWeight: 800 }}>adaptive space-time coordinates</strong>
            </span>
          )}
        </p>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. 4-STAGE PIPELINE GRID                             */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          left: startX,
          top: startY,
          width: totalGridWidth,
          height: cardHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        {DBTA_STEPS.map((step, idx) => {
          const isActive = activeBooleans[idx];
          const isDimmed = dimmedBooleans[idx];
          const activation = activationValues[idx];

          return (
            <React.Fragment key={step.id}>
              {/* Step Card */}
              <StepCard
                step={step}
                index={idx}
                isActive={isActive}
                isDimmed={isDimmed}
                activationProgress={activation}
                width={cardWidth}
                height={cardHeight}
              />

              {/* Connecting Flow Arrow (Between cards) */}
              {idx < 3 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: cardGap,
                    color: isSynthesis ? '#0f172a' : isActive && activeBooleans[idx + 1] ? '#0f172a' : '#cbd5e1',
                    fontSize: 24,
                    fontWeight: 900,
                    fontFamily: MONO_FONT,
                    userSelect: 'none',
                    opacity: isOverview || isSynthesis ? 0.9 : 0.35,
                    transition: 'color 0.25s ease, opacity 0.25s ease',
                  }}
                >
                  ➔
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. SUBTLE FOOTER SUMMARY LINE                        */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          bottom: 45,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          fontSize: 14,
          fontFamily: MONO_FONT,
          fontWeight: 700,
          color: MUTED_TEXT,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        <span>Deterministic O(N) Compute</span>
        <span>·</span>
        <span>Guaranteed Invariants</span>
        <span>·</span>
        <span>Synchronized Multi-View Mapping</span>
      </div>
    </AbsoluteFill>
  );
};
