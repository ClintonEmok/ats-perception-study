import React from 'react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DARK_TEXT, DBTA_STEPS, MUTED_TEXT } from './data';
import { StepCard } from './StepCard';

interface HeroStepSummaryProps {
  width: number;
  height: number;
}

export const HeroStepSummary: React.FC<HeroStepSummaryProps> = ({ width, height }) => {
  const cardWidth = 370;
  const cardHeight = 560;
  const cardGap = 38;
  const totalGridWidth = 4 * cardWidth + 3 * cardGap;

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        boxSizing: 'border-box',
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* 4 Cards Grid */}
      <div
        style={{
          width: totalGridWidth,
          height: cardHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 10,
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

            {idx < 3 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: cardGap,
                  color: '#0f172a',
                  fontSize: 24,
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

      {/* Subtle Footer */}
      <div
        style={{
          marginTop: 26,
          display: 'flex',
          alignItems: 'center',
          fontSize: 15,
          fontFamily: MONO_FONT,
          fontWeight: 800,
          color: MUTED_TEXT,
          userSelect: 'none',
        }}
      >
        <span>Time Complexity: O(N)</span>
      </div>
    </div>
  );
};
