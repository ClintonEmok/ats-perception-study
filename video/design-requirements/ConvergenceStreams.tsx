import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

interface ConvergenceStreamsProps {
  stream1StartFrame: number; // e.g. 175
  stream2StartFrame: number; // e.g. 245
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const ConvergenceStreams: React.FC<ConvergenceStreamsProps> = ({
  stream1StartFrame,
  stream2StartFrame,
}) => {
  const frame = useCurrentFrame();

  // Progress of Stream 1 (Columns -> Goals)
  const stream1Progress = interpolate(
    frame,
    [stream1StartFrame, stream1StartFrame + 30],
    [0, 1],
    clamp
  );

  // Progress of Stream 2 (Goals -> Requirements)
  const stream2Progress = interpolate(
    frame,
    [stream2StartFrame, stream2StartFrame + 30],
    [0, 1],
    clamp
  );

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: 1920,
        height: 1080,
        pointerEvents: 'none',
        zIndex: 5,
        overflow: 'visible',
      }}
    >
      <defs>
        <linearGradient id="stream1-left" x1="0%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.95" />
        </linearGradient>

        <linearGradient id="stream1-mid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.95" />
        </linearGradient>

        <linearGradient id="stream1-right" x1="100%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.95" />
        </linearGradient>

        <linearGradient id="stream2-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0d9488" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* =================================================== */}
      {/* 1. TOP CONVERGENCE: Columns -> Goals (Y: 460 -> 496)*/}
      {/* =================================================== */}
      {stream1Progress > 0 && (
        <g opacity={stream1Progress}>
          {/* Left Column (Analytical Tasks) -> Center Nexus */}
          <path
            d="M 344 460 C 344 480, 780 480, 960 496"
            fill="none"
            stroke="url(#stream1-left)"
            strokeWidth="3.2"
            strokeDasharray="1000"
            strokeDashoffset={(1 - stream1Progress) * 1000}
          />
          {/* Left direct branch to G1/G2 */}
          <path
            d="M 344 460 C 344 480, 480 482, 530 496"
            fill="none"
            stroke="url(#stream1-left)"
            strokeWidth="2.2"
            strokeDasharray="4 4"
            opacity="0.65"
          />

          {/* Middle Column (Data Properties) -> Center Nexus */}
          <path
            d="M 960 460 L 960 496"
            fill="none"
            stroke="url(#stream1-mid)"
            strokeWidth="3.2"
            strokeDasharray="1000"
            strokeDashoffset={(1 - stream1Progress) * 1000}
          />

          {/* Right Column (Visualization Principles) -> Center Nexus */}
          <path
            d="M 1576 460 C 1576 480, 1140 480, 960 496"
            fill="none"
            stroke="url(#stream1-right)"
            strokeWidth="3.2"
            strokeDasharray="1000"
            strokeDashoffset={(1 - stream1Progress) * 1000}
          />
          {/* Right direct branch to G4/G5 */}
          <path
            d="M 1576 460 C 1576 480, 1440 482, 1390 496"
            fill="none"
            stroke="url(#stream1-right)"
            strokeWidth="2.2"
            strokeDasharray="4 4"
            opacity="0.65"
          />

          {/* Convergence Node Glow Indicator */}
          <circle cx="960" cy="496" r="5" fill="#0d9488" />
          <circle cx="960" cy="496" r="9" fill="rgba(13, 148, 136, 0.25)" />
        </g>
      )}

      {/* =================================================== */}
      {/* 2. BOTTOM CONVERGENCE: Goals -> Reqs (Y: 672 -> 712)*/}
      {/* =================================================== */}
      {stream2Progress > 0 && (
        <g opacity={stream2Progress}>
          {/* Center Nexus Descent */}
          <path
            d="M 960 672 L 960 712"
            fill="none"
            stroke="url(#stream2-grad)"
            strokeWidth="3.2"
            strokeDasharray="1000"
            strokeDashoffset={(1 - stream2Progress) * 1000}
          />

          {/* Branching Left to Col 1 Reqs */}
          <path
            d="M 960 672 C 960 694, 360 694, 344 712"
            fill="none"
            stroke="url(#stream2-grad)"
            strokeWidth="2.6"
            strokeDasharray="1000"
            strokeDashoffset={(1 - stream2Progress) * 1000}
          />

          {/* Branching Right to Col 3 Reqs */}
          <path
            d="M 960 672 C 960 694, 1560 694, 1576 712"
            fill="none"
            stroke="url(#stream2-grad)"
            strokeWidth="2.6"
            strokeDasharray="1000"
            strokeDashoffset={(1 - stream2Progress) * 1000}
          />

          {/* Convergence Node Glow Indicator */}
          <circle cx="960" cy="712" r="5" fill="#4f46e5" />
          <circle cx="960" cy="712" r="9" fill="rgba(79, 70, 229, 0.25)" />
        </g>
      )}
    </svg>
  );
};
