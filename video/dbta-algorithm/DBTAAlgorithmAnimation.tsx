import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { CANVAS_HEIGHT, CANVAS_WIDTH, DARK_TEXT, DBTA_STEPS, MUTED_TEXT } from './data';
import { HeroStep0RawEvents } from './HeroStep0RawEvents';
import { HeroStep1Partition } from './HeroStep1Partition';
import { HeroStep2Density } from './HeroStep2Density';
import { HeroStep3Weights } from './HeroStep3Weights';
import { HeroStep4Integration } from './HeroStep4Integration';
import { HeroStepSummary } from './HeroStepSummary';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const DBTAAlgorithmAnimation: React.FC = () => {
  const frame = useCurrentFrame();

  // Timeline choreography (30 fps):
  // 0s - 10s (0..300): Step 1 Raw Event Sequence
  // 10s - 20s (300..600): Step 2 Hourly Binning
  // 20s - 30s (600..900): Step 3 Density Estimation
  // 30s - 40s (900..1200): Step 4 Space Reallocation
  // 40s - 50s (1200..1500): Step 5 Coordinate Integration
  // 50s - 65s (1500..1950): Summary View (All 5 Steps Grid)

  // Current active step index (0..4 for hero steps, 5 for master summary)
  let activeStepIndex = 0;
  let stepLocalProgress = 0;

  if (frame < 300) {
    activeStepIndex = 0;
    stepLocalProgress = frame / 300;
  } else if (frame < 600) {
    activeStepIndex = 1;
    stepLocalProgress = (frame - 300) / 300;
  } else if (frame < 900) {
    activeStepIndex = 2;
    stepLocalProgress = (frame - 600) / 300;
  } else if (frame < 1200) {
    activeStepIndex = 3;
    stepLocalProgress = (frame - 900) / 300;
  } else if (frame < 1500) {
    activeStepIndex = 4;
    stepLocalProgress = (frame - 1200) / 300;
  } else {
    activeStepIndex = 5;
    stepLocalProgress = Math.min(1, (frame - 1500) / 60);
  }

  // Cross-fade opacity between hero stages
  const step0Opacity = interpolate(frame, [0, 20, 280, 300], [0, 1, 1, 0], clamp);
  const step1Opacity = interpolate(frame, [300, 320, 580, 600], [0, 1, 1, 0], clamp);
  const step2Opacity = interpolate(frame, [600, 620, 880, 900], [0, 1, 1, 0], clamp);
  const step3Opacity = interpolate(frame, [900, 920, 1180, 1200], [0, 1, 1, 0], clamp);
  const step4Opacity = interpolate(frame, [1200, 1220, 1480, 1500], [0, 1, 1, 0], clamp);
  const summaryOpacity = interpolate(frame, [1500, 1530], [0, 1], clamp);

  const activeStep = activeStepIndex < 5 ? DBTA_STEPS[activeStepIndex] : null;

  return (
    <div
      style={{
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: '#f8fafc',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '30px 40px',
        boxSizing: 'border-box',
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* Dynamic Stepper Bar (visible during hero steps 0..4) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          marginBottom: 16,
          zIndex: 50,
          opacity: activeStepIndex < 5 ? 1 : summaryOpacity,
          transition: 'opacity 0.3s ease',
        }}
      >
        {DBTA_STEPS.map((s, idx) => {
          const isCurrent = activeStepIndex === idx;
          const isPast = activeStepIndex > idx;

          return (
            <React.Fragment key={`stepper-${s.id}`}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  borderRadius: 999,
                  backgroundColor: isCurrent
                    ? '#ffffff'
                    : isPast
                    ? 'rgba(15, 23, 42, 0.05)'
                    : 'rgba(15, 23, 42, 0.02)',
                  border: isCurrent
                    ? `2px solid ${s.accentColor}`
                    : '1px solid rgba(15, 23, 42, 0.08)',
                  boxShadow: isCurrent ? '0 4px 14px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: isCurrent
                      ? s.accentColor
                      : isPast
                      ? '#0f172a'
                      : 'rgba(15, 23, 42, 0.2)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 900,
                    fontFamily: MONO_FONT,
                  }}
                >
                  {idx + 1}
                </div>

                <span
                  style={{
                    fontSize: 12,
                    fontFamily: MONO_FONT,
                    fontWeight: isCurrent ? 900 : 700,
                    color: isCurrent ? DARK_TEXT : MUTED_TEXT,
                    letterSpacing: 0.5,
                  }}
                >
                  {s.title}
                </span>
              </div>

              {idx < 4 && (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: 'rgba(15, 23, 42, 0.3)',
                    userSelect: 'none',
                  }}
                >
                  ➔
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Main Full-Screen Hero Visual Stage Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Step 1 Hero: Raw Event Stream */}
        {step0Opacity > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: step0Opacity,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HeroStep0RawEvents
              progress={stepLocalProgress}
              width={CANVAS_WIDTH - 80}
              height={CANVAS_HEIGHT - 130}
            />
          </div>
        )}

        {/* Step 2 Hero: Hourly Binning */}
        {step1Opacity > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: step1Opacity,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HeroStep1Partition
              progress={stepLocalProgress}
              width={CANVAS_WIDTH - 80}
              height={CANVAS_HEIGHT - 130}
            />
          </div>
        )}

        {/* Step 3 Hero: Density Estimation */}
        {step2Opacity > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: step2Opacity,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HeroStep2Density
              progress={stepLocalProgress}
              width={CANVAS_WIDTH - 80}
              height={CANVAS_HEIGHT - 130}
            />
          </div>
        )}

        {/* Step 4 Hero: Space Reallocation */}
        {step3Opacity > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: step3Opacity,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HeroStep3Weights
              progress={stepLocalProgress}
              width={CANVAS_WIDTH - 80}
              height={CANVAS_HEIGHT - 130}
            />
          </div>
        )}

        {/* Step 5 Hero: Coordinate Integration */}
        {step4Opacity > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: step4Opacity,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HeroStep4Integration
              progress={stepLocalProgress}
              width={CANVAS_WIDTH - 80}
              height={CANVAS_HEIGHT - 130}
            />
          </div>
        )}

        {/* Master Summary View (All 5 Cards Grid) */}
        {summaryOpacity > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: summaryOpacity,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HeroStepSummary
              width={CANVAS_WIDTH - 80}
              height={CANVAS_HEIGHT - 130}
            />
          </div>
        )}
      </div>
    </div>
  );
};
