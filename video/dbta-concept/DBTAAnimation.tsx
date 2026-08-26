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
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DARK_TEXT,
  DBTA_BOUNDARIES,
  EVENT_COUNTS,
  MUTED_TEXT,
  TIME_LABELS,
  TIMELINE_WIDTH,
  TIMELINE_X,
  TIMELINE_Y,
  TUE_RED,
  UNIFORM_BOUNDARIES,
} from './data';
import { DBTATimeline } from './DBTATimeline';
import { DensityCurve } from './DensityCurve';
import { MappingIndicator } from './MappingIndicator';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const DBTAAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clamp effective frame at 900 (30.0s) for 100% static stillness for the remaining 30s
  const effectiveFrame = Math.min(frame, 900);

  // -------------------------------------------------------------------------
  // Thoughtful, Unhurried Construction Narrative Timeline:
  // Phase 1 (0..180 / 0.0s..6.0s): Fixed 1-hr intervals baseline
  // Phase 2 (180..390 / 6.0s..13.0s): Measure event density curve resolves
  // Phase 3 (390..600 / 13.0s..20.0s): Core mapping rule (Density -> Space)
  // Phase 4 (600..870 / 20.0s..29.0s): Hero expansion of 14-15 & decluttering
  // Phase 5 (870..1800 / 29.0s..60.0s): Final Still & presentation hold
  // -------------------------------------------------------------------------

  // 1. Density curve entrance (Phase 2: 180 -> 270, 3.0s smooth rise)
  const densityReveal = interpolate(effectiveFrame, [180, 270], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  // 2. Mapping Indicator entrance (Phase 3: 390 -> 470, 2.67s smooth entrance)
  const mappingReveal = interpolate(effectiveFrame, [390, 470], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  // 3. Hero Transformation Progress (Phase 4: 600 -> 870, 9.0s luxurious transformation)
  const transformationProgress = interpolate(effectiveFrame, [600, 870], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  const isPhase1 = effectiveFrame < 180;
  const isPhase2 = effectiveFrame >= 180 && effectiveFrame < 390;
  const isPhase3 = effectiveFrame >= 390 && effectiveFrame < 600;
  const isFinalOrHero = effectiveFrame >= 600;

  // Title crossfade opacity transitions between phases
  let titleOpacity = 1;
  if (effectiveFrame >= 170 && effectiveFrame < 185) {
    titleOpacity = interpolate(effectiveFrame, [170, 177, 185], [1, 0.2, 1], clamp);
  } else if (effectiveFrame >= 380 && effectiveFrame < 395) {
    titleOpacity = interpolate(effectiveFrame, [380, 387, 395], [1, 0.2, 1], clamp);
  } else if (effectiveFrame >= 590 && effectiveFrame < 605) {
    titleOpacity = interpolate(effectiveFrame, [590, 597, 605], [1, 0.2, 1], clamp);
  }

  // Moving interval boundary positions
  const currentBoundaries = UNIFORM_BOUNDARIES.map((uX, idx) => {
    const aX = DBTA_BOUNDARIES[idx];
    return interpolate(transformationProgress, [0, 1], [uX, aX], clamp);
  });

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
          marginTop: 85,
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 30,
          opacity: titleOpacity,
          transition: 'opacity 0.15s ease',
        }}
      >
        {/* Main Hero Title */}
        <h1
          style={{
            margin: 0,
            fontSize: 48,
            fontWeight: 900,
            color: DARK_TEXT,
            letterSpacing: isFinalOrHero ? 1.5 : 0.5,
            textTransform: 'uppercase',
          }}
        >
          {isFinalOrHero
            ? 'DENSITY-BASED TEMPORAL ALLOCATION'
            : isPhase3
            ? 'EVENT DENSITY DETERMINES ALLOCATION'
            : isPhase2
            ? 'MEASURE EVENT DENSITY'
            : 'FIXED TEMPORAL INTERVALS'}
        </h1>

        {/* Subtitle / Core Message */}
        <p
          style={{
            margin: '10px 0 0 0',
            fontSize: 22,
            fontWeight: 600,
            color: isFinalOrHero ? DARK_TEXT : MUTED_TEXT,
            letterSpacing: -0.2,
          }}
        >
          {isFinalOrHero ? (
            <span>
              <strong style={{ color: TUE_RED, fontWeight: 800 }}>Event density</strong> determines{' '}
              <strong style={{ color: '#2563eb', fontWeight: 800 }}>visual space</strong>
            </span>
          ) : isPhase3 ? (
            'High density receives larger visual space; low density is compressed'
          ) : isPhase2 ? (
            'The event distribution resolves into a continuous density signal'
          ) : (
            'The interval boundaries remain fixed in clock time [12:00, 13:00, 14:00, 15:00, 16:00, 17:00]'
          )}
        </p>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. THE MAPPING FORMULA CARD (Steps 3 & 4)            */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          top: 255,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 25,
          pointerEvents: 'none',
        }}
      >
        <MappingIndicator
          revealProgress={mappingReveal}
          isTransforming={transformationProgress > 0}
        />
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. UNIFIED VISUALIZATION BOX (Columns + Curve + Axis)*/}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          left: TIMELINE_X,
          top: 400,
          width: TIMELINE_WIDTH,
          height: 380,
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        {/* 3a. Interval Column Background Tint Bands */}
        {[0, 1, 2, 3, 4].map((idx) => {
          const left = currentBoundaries[idx];
          const right = currentBoundaries[idx + 1];
          const sliceW = right - left;
          const isBurst = idx === 2;
          const isEven = idx % 2 === 0;

          let bgColor = isEven ? 'rgba(15, 23, 42, 0.015)' : 'rgba(15, 23, 42, 0.04)';
          if (isBurst) {
            bgColor = 'rgba(200, 16, 46, 0.035)';
          }

          return (
            <div
              key={`col-${idx}`}
              style={{
                position: 'absolute',
                left,
                top: 0,
                width: sliceW,
                height: 270,
                backgroundColor: bgColor,
                borderLeft: idx > 0 ? '1.5px dashed rgba(15, 23, 42, 0.16)' : 'none',
                borderRight: idx < 4 ? '1.5px dashed rgba(15, 23, 42, 0.16)' : 'none',
                borderTop: '1px solid rgba(15, 23, 42, 0.1)',
                borderBottom: '1px solid rgba(15, 23, 42, 0.1)',
                borderRadius: idx === 0 ? '8px 0 0 8px' : idx === 4 ? '0 8px 8px 0' : '0',
                boxSizing: 'border-box',
                zIndex: 1,
              }}
            >
              {/* Interval header tag (Interval Name + Event Count) */}
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  opacity: 0.9,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: MONO_FONT,
                    fontWeight: 800,
                    color: isBurst ? TUE_RED : DARK_TEXT,
                  }}
                >
                  {TIME_LABELS[idx]}–{TIME_LABELS[idx + 1]}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: FONT_FAMILY,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 999,
                    backgroundColor: isBurst ? TUE_RED : '#0f172a',
                    color: '#ffffff',
                  }}
                >
                  {EVENT_COUNTS[idx]} {EVENT_COUNTS[idx] === 1 ? 'event' : 'events'}
                </span>
              </div>
            </div>
          );
        })}

        {/* 3b. Continuous Density Signal Curve */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 40,
            width: TIMELINE_WIDTH,
            height: 165,
            zIndex: 15,
          }}
        >
          <DensityCurve
            progress={transformationProgress}
            revealProgress={densityReveal}
            width={TIMELINE_WIDTH}
            height={165}
            showPeakLabel={true}
          />
        </div>

        {/* 3c. Timeline Axis, Moving Ticks & Event Dots */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 185,
            width: TIMELINE_WIDTH,
            height: 170,
            zIndex: 20,
          }}
        >
          <DBTATimeline
            progress={transformationProgress}
            width={TIMELINE_WIDTH}
            height={170}
            baselineY={20}
            eventDotSize={22}
            showIntervalLabels={false}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
