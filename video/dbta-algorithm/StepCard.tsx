import React from 'react';
import { interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { AlgorithmStep, DARK_TEXT, MUTED_TEXT, TUE_RED } from './data';
import { StepDiagram } from './StepDiagram';

interface StepCardProps {
  step: AlgorithmStep;
  index: number;
  isActive: boolean;
  isDimmed: boolean;
  activationProgress: number; // 0 to 1
  width: number;
  height: number;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const StepCard: React.FC<StepCardProps> = ({
  step,
  index,
  isActive,
  isDimmed,
  activationProgress,
  width,
  height,
}) => {
  // Visual elevation & scale when highlighted
  const scale = interpolate(activationProgress, [0, 1], [1, 1.025], clamp);
  const borderWidth = interpolate(activationProgress, [0, 1], [1.5, 2.5], clamp);
  const borderColor = isActive ? step.accentColor : 'rgba(15, 23, 42, 0.12)';
  const shadow = isActive
    ? `0 14px 34px rgba(15, 23, 42, 0.1), 0 0 0 1px ${step.accentColor}`
    : '0 4px 14px rgba(15, 23, 42, 0.03)';
  const bg = isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.95)';
  const opacity = isDimmed ? 0.38 : 1;

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: bg,
        opacity,
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: 16,
        boxShadow: shadow,
        transform: `scale(${scale})`,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        padding: '22px 20px',
        position: 'relative',
        userSelect: 'none',
        transition: 'opacity 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
      }}
    >
      {/* Top Header Row: Step Pill + Accent Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            borderRadius: 6,
            backgroundColor: isActive ? step.accentColor : 'rgba(15, 23, 42, 0.06)',
            color: isActive ? '#ffffff' : DARK_TEXT,
            fontSize: 12,
            fontFamily: MONO_FONT,
            fontWeight: 800,
            letterSpacing: 1.2,
          }}
        >
          {step.stepNumber}
        </div>

        <div
          style={{
            fontSize: 12,
            fontFamily: FONT_FAMILY,
            fontWeight: 700,
            color: MUTED_TEXT,
          }}
        >
          {step.subtitle}
        </div>
      </div>

      {/* Step Title */}
      <h3
        style={{
          margin: 0,
          fontSize: 19,
          fontFamily: FONT_FAMILY,
          fontWeight: 900,
          color: DARK_TEXT,
          letterSpacing: -0.2,
          lineHeight: 1.2,
        }}
      >
        {step.title}
      </h3>

      {/* Formula Badge */}
      <div
        style={{
          marginTop: 10,
          padding: '8px 10px',
          borderRadius: 8,
          backgroundColor: 'rgba(15, 23, 42, 0.04)',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          fontFamily: MONO_FONT,
          fontSize: 11.5,
          fontWeight: 800,
          color: isActive ? step.accentColor : DARK_TEXT,
          letterSpacing: -0.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: 'center',
        }}
      >
        {step.formula}
      </div>

      {/* Middle Interactive Mini Diagram */}
      <div
        style={{
          marginTop: 14,
          marginBottom: 12,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.015)',
          borderRadius: 10,
          border: '1px solid rgba(15, 23, 42, 0.05)',
          padding: '6px 2px',
        }}
      >
        <StepDiagram
          stepIndex={index}
          progress={activationProgress}
          width={width - 48}
          height={125}
        />
      </div>

      {/* Short Description */}
      <p
        style={{
          margin: '0',
          fontSize: 13.5,
          fontFamily: FONT_FAMILY,
          fontWeight: 500,
          color: MUTED_TEXT,
          lineHeight: 1.4,
        }}
      >
        {step.description}
      </p>
    </div>
  );
};
