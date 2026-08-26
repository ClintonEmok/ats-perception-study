import React from 'react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DBTA_STEPS, MUTED_TEXT } from './data';
import { StepCard } from './StepCard';

interface HeroStepSummaryProps {
  width: number;
  height: number;
}

export const HeroStepSummary: React.FC<HeroStepSummaryProps> = ({ width, height }) => {
  const padX = 35;
  const stageW = width - 2 * padX;

  const cardWidth = 348;
  const cardHeight = 630;
  const cardGap = 20;

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* 5 Cards Grid */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: stageW,
        }}
      >
        {DBTA_STEPS.map((step, idx) => (
          <React.Fragment key={step.id}>
            <StepCard
              step={step}
              index={idx}
              isActive={true}
              isDimmed={false}
              activationProgress={1}
              width={cardWidth}
              height={cardHeight}
            />

            {idx < 4 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: cardGap,
                  color: '#0f172a',
                  fontSize: 22,
                  fontWeight: 900,
                  fontFamily: MONO_FONT,
                  userSelect: 'none',
                }}
              >
                ➔
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Clean Invariant Footer */}
      <div
        style={{
          marginTop: 28,
          display: 'flex',
          alignItems: 'center',
          fontSize: 16,
          fontFamily: MONO_FONT,
          fontWeight: 800,
          color: MUTED_TEXT,
          userSelect: 'none',
          letterSpacing: 0.5,
        }}
      >
        <span>Time Complexity: O(N)</span>
      </div>
    </div>
  );
};
