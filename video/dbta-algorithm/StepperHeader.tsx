import React from 'react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DARK_TEXT, DBTA_STEPS, MUTED_TEXT, TUE_RED } from './data';

interface StepperHeaderProps {
  currentStepIndex: number; // 0, 1, 2, 3, or 4 (summary)
}

export const StepperHeader: React.FC<StepperHeaderProps> = ({ currentStepIndex }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginTop: 40,
        zIndex: 40,
        userSelect: 'none',
      }}
    >
      {DBTA_STEPS.map((step, idx) => {
        const isActive = currentStepIndex === idx;
        const isPast = currentStepIndex > idx;
        const isSummary = currentStepIndex === 4;

        let bg = 'rgba(15, 23, 42, 0.04)';
        let textColor = MUTED_TEXT;
        let borderColor = 'rgba(15, 23, 42, 0.1)';

        if (isActive) {
          bg = '#ffffff';
          textColor = DARK_TEXT;
          borderColor = step.accentColor;
        } else if (isSummary) {
          bg = '#ffffff';
          textColor = DARK_TEXT;
          borderColor = step.accentColor;
        } else if (isPast) {
          bg = 'rgba(15, 23, 42, 0.06)';
          textColor = DARK_TEXT;
          borderColor = 'rgba(15, 23, 42, 0.18)';
        }

        return (
          <React.Fragment key={step.id}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 18px',
                borderRadius: 999,
                backgroundColor: bg,
                border: `2px solid ${borderColor}`,
                boxShadow: isActive ? `0 6px 18px rgba(0,0,0,0.08), 0 0 0 1px ${step.accentColor}` : 'none',
                transform: isActive ? 'scale(1.04)' : 'scale(1)',
                transition: 'all 0.25s ease',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  backgroundColor: isActive || isSummary ? step.accentColor : isPast ? '#0f172a' : '#cbd5e1',
                  color: '#ffffff',
                  fontFamily: MONO_FONT,
                  fontSize: 11,
                  fontWeight: 900,
                }}
              >
                {idx + 1}
              </span>
              <span
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: 14,
                  fontWeight: isActive || isSummary ? 800 : 600,
                  color: textColor,
                  letterSpacing: -0.2,
                }}
              >
                {step.title}
              </span>
            </div>

            {idx < 3 && (
              <span
                style={{
                  color: isPast || isSummary ? '#0f172a' : '#cbd5e1',
                  fontSize: 18,
                  fontWeight: 900,
                  fontFamily: MONO_FONT,
                }}
              >
                ➔
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
