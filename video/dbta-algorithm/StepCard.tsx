import React from 'react';
import { interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { AlgorithmStep, DARK_TEXT, MUTED_TEXT } from './data';
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

export const StepCard: React.FC<StepCardProps> = ({
  step,
  index,
  isActive,
  isDimmed,
  activationProgress,
  width,
  height,
}) => {
  const scale = interpolate(activationProgress, [0, 1], [1, 1.02]);
  const cardOpacity = isDimmed ? 0.4 : 1;

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: '#ffffff',
        borderRadius: 18,
        border: isActive
          ? `2.5px solid ${step.accentColor}`
          : '1.5px solid rgba(15, 23, 42, 0.1)',
        boxShadow: isActive
          ? `0 20px 48px rgba(0, 0, 0, 0.08), 0 0 0 1px ${step.accentColor}22`
          : '0 6px 20px rgba(0, 0, 0, 0.03)',
        transform: `scale(${scale})`,
        opacity: cardOpacity,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 22px 20px 22px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Tag & Number */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            backgroundColor: isActive
              ? `${step.accentColor}18`
              : 'rgba(15, 23, 42, 0.05)',
            color: isActive ? step.accentColor : DARK_TEXT,
            fontFamily: MONO_FONT,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.5,
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
          fontSize: 20,
          fontFamily: FONT_FAMILY,
          fontWeight: 900,
          color: DARK_TEXT,
          letterSpacing: -0.3,
          lineHeight: 1.2,
        }}
      >
        {step.title}
      </h3>

      {/* Formula Badge */}
      <div
        style={{
          marginTop: 10,
          padding: '8px 12px',
          borderRadius: 8,
          backgroundColor: 'rgba(15, 23, 42, 0.04)',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          fontFamily: MONO_FONT,
          fontSize: 12,
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
          marginBottom: 14,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.015)',
          borderRadius: 10,
          border: '1px solid rgba(15, 23, 42, 0.05)',
          padding: '8px 4px',
          boxSizing: 'border-box',
        }}
      >
        <StepDiagram
          stepIndex={index}
          progress={activationProgress}
          width={width - 52}
          height={260}
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
