import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DARK_TEXT, MUTED_TEXT, TUE_RED } from './data';
import { HeroStep1Partition } from './HeroStep1Partition';
import { HeroStep2Density } from './HeroStep2Density';
import { HeroStep3Weights } from './HeroStep3Weights';
import { HeroStep4Integration } from './HeroStep4Integration';
import { HeroStepSummary } from './HeroStepSummary';
import { StepperHeader } from './StepperHeader';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const DBTAAlgorithmAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Clamp effective frame at 1500 (50.0s) for 100% static stillness for the remaining 10s
  const effectiveFrame = Math.min(frame, 1500);

  // -------------------------------------------------------------------------
  // Narrative Pacing (Full-Screen Hero Stages):
  // Stage 1 (0..360 / 0.0s..12.0s): Step 1 - Temporal Partitioning
  // Stage 2 (360..720 / 12.0s..24.0s): Step 2 - Density Estimation
  // Stage 3 (720..1080 / 24.0s..36.0s): Step 3 - Weight Allocation & Floor
  // Stage 4 (1080..1440 / 36.0s..48.0s): Step 4 - Coordinate Integration & Warp
  // Stage 5 (1440..1800 / 48.0s..60.0s): Full Master Architecture Summary
  // -------------------------------------------------------------------------

  let currentStepIndex = 0;
  if (effectiveFrame >= 360 && effectiveFrame < 720) currentStepIndex = 1;
  else if (effectiveFrame >= 720 && effectiveFrame < 1080) currentStepIndex = 2;
  else if (effectiveFrame >= 1080 && effectiveFrame < 1440) currentStepIndex = 3;
  else if (effectiveFrame >= 1440) currentStepIndex = 4;

  // Local progress inside each stage (0 to 1)
  const prog1 = interpolate(effectiveFrame, [0, 360], [0, 1], clamp);
  const prog2 = interpolate(effectiveFrame, [360, 720], [0, 1], clamp);
  const prog3 = interpolate(effectiveFrame, [720, 1080], [0, 1], clamp);
  const prog4 = interpolate(effectiveFrame, [1080, 1440], [0, 1], clamp);
  const progSummary = interpolate(effectiveFrame, [1440, 1500], [0, 1], clamp);

  // Crossfade opacity for seamless transitions
  const opacity1 = interpolate(effectiveFrame, [0, 15, 345, 360], [1, 1, 1, 0], clamp);
  const opacity2 = interpolate(effectiveFrame, [360, 375, 705, 720], [0, 1, 1, 0], clamp);
  const opacity3 = interpolate(effectiveFrame, [720, 735, 1065, 1080], [0, 1, 1, 0], clamp);
  const opacity4 = interpolate(effectiveFrame, [1080, 1095, 1425, 1440], [0, 1, 1, 0], clamp);
  const opacitySummary = interpolate(effectiveFrame, [1440, 1455], [0, 1], clamp);

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
      {/* 1. TOP STEPPER BREADCRUMB HEADER */}
      <StepperHeader currentStepIndex={currentStepIndex} />

      {/* 2. MAIN FULL-SCREEN HERO STAGE */}
      <div
        style={{
          marginTop: 25,
          width: 1720,
          height: 900,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Step 1 Hero */}
        {effectiveFrame < 365 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: opacity1,
            }}
          >
            <HeroStep1Partition progress={prog1} width={1720} height={880} />
          </div>
        )}

        {/* Step 2 Hero */}
        {effectiveFrame >= 355 && effectiveFrame < 725 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: opacity2,
            }}
          >
            <HeroStep2Density progress={prog2} width={1720} height={880} />
          </div>
        )}

        {/* Step 3 Hero */}
        {effectiveFrame >= 715 && effectiveFrame < 1085 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: opacity3,
            }}
          >
            <HeroStep3Weights progress={prog3} width={1720} height={880} />
          </div>
        )}

        {/* Step 4 Hero */}
        {effectiveFrame >= 1075 && effectiveFrame < 1445 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: opacity4,
            }}
          >
            <HeroStep4Integration progress={prog4} width={1720} height={880} />
          </div>
        )}

        {/* Master Summary Grid */}
        {effectiveFrame >= 1435 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: opacitySummary,
            }}
          >
            <HeroStepSummary width={1720} height={880} />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
