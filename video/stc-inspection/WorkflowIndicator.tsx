import React from 'react';
import { MONO_FONT } from '../theme';
import { THEME } from './data';

const WORKFLOW_STEPS = [
  { id: 'overview', label: 'OVERVIEW', active: false, accent: THEME.navy },
  { id: 'select', label: 'SELECT', active: false, accent: THEME.navy },
  { id: 'inspect', label: 'INSPECT', active: true, accent: THEME.tueRed },
  { id: 'compare', label: 'COMPARE', active: false, accent: THEME.textMuted },
];

export const WorkflowIndicator: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 12px',
        borderRadius: 999,
        background: '#ffffff',
        border: '1px solid rgba(15, 23, 42, 0.08)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
        ...style,
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
                gap: 6,
                padding: '3px 10px',
                borderRadius: 999,
                background: step.active
                  ? THEME.tueRedBg
                  : 'transparent',
                border: step.active
                  ? `1px solid ${THEME.tueRedBorder}`
                  : '1px solid transparent',
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: step.active ? step.accent : 'rgba(100, 116, 139, 0.3)',
                }}
              />
              <span
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: 11,
                  fontWeight: step.active ? 850 : 600,
                  letterSpacing: 1.2,
                  color: step.active ? step.accent : 'rgba(100, 116, 139, 0.45)',
                }}
              >
                {step.label}
              </span>
            </div>

            {!isLast && (
              <span
                style={{
                  color: 'rgba(15, 23, 42, 0.25)',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: MONO_FONT,
                  userSelect: 'none',
                }}
              >
                →
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
