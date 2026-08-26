import React from 'react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DARK_TEXT, MUTED_TEXT, TUE_RED } from './data';

interface StepDiagramProps {
  stepIndex: number; // 0, 1, 2, 3
  progress: number; // 0 to 1 inside step
  width: number;
  height: number;
}

export const StepDiagram: React.FC<StepDiagramProps> = ({
  stepIndex,
  progress,
  width,
  height,
}) => {
  const padX = 26;
  const plotW = width - 2 * padX;

  // Step 1: Fixed Uniform Intervals & Clustered Points
  if (stepIndex === 0) {
    const ticks = [0, 1, 2, 3, 4, 5];
    const sliceW = plotW / 5;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Interval 2 (Burst) Highlight Box */}
        <rect
          x={padX + 2 * sliceW}
          y={height / 2 - 25}
          width={sliceW}
          height={50}
          fill="rgba(200, 16, 46, 0.08)"
          stroke={TUE_RED}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          rx={4}
        />

        {/* Baseline Axis */}
        <line
          x1={padX}
          y1={height / 2}
          x2={padX + plotW}
          y2={height / 2}
          stroke="#0f172a"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Uniform Interval Ticks */}
        {ticks.map((t) => {
          const x = padX + t * sliceW;
          return (
            <g key={`t-${t}`}>
              <line
                x1={x}
                y1={height / 2 - 12}
                x2={x}
                y2={height / 2 + 12}
                stroke="#0f172a"
                strokeWidth={2}
              />
              <text
                x={x}
                y={height / 2 + 28}
                textAnchor="middle"
                fontSize={10}
                fontFamily={MONO_FONT}
                fontWeight={800}
                fill={DARK_TEXT}
              >
                {t === 0 ? '12:00' : t === 5 ? '17:00' : `+${t}h`}
              </text>
            </g>
          );
        })}

        {/* Event dots inside intervals */}
        {/* Interval 0: 2 dots */}
        <circle cx={padX + 0.3 * sliceW} cy={height / 2} r={4} fill="#0f172a" />
        <circle cx={padX + 0.7 * sliceW} cy={height / 2} r={4} fill="#0f172a" />

        {/* Interval 1: 3 dots */}
        <circle cx={padX + 1.25 * sliceW} cy={height / 2} r={4} fill="#0f172a" />
        <circle cx={padX + 1.5 * sliceW} cy={height / 2} r={4} fill="#0f172a" />
        <circle cx={padX + 1.8 * sliceW} cy={height / 2} r={4} fill="#0f172a" />

        {/* Interval 2: Dense cluster (TU/e red) */}
        {Array.from({ length: 14 }).map((_, i) => (
          <circle
            key={`burst-dot-${i}`}
            cx={padX + 2 * sliceW + 3 + (i / 13) * (sliceW - 6)}
            cy={height / 2}
            r={4}
            fill={TUE_RED}
            stroke="#ffffff"
            strokeWidth={1}
          />
        ))}

        {/* Interval 3: 1 dot */}
        <circle cx={padX + 3.5 * sliceW} cy={height / 2} r={4} fill="#0f172a" />

        {/* Interval 4: 3 dots */}
        <circle cx={padX + 4.3 * sliceW} cy={height / 2} r={4} fill="#0f172a" />
        <circle cx={padX + 4.6 * sliceW} cy={height / 2} r={4} fill="#0f172a" />
        <circle cx={padX + 4.85 * sliceW} cy={height / 2} r={4} fill="#0f172a" />

        <text
          x={padX + 2.5 * sliceW}
          y={height / 2 - 30}
          textAnchor="middle"
          fontSize={10}
          fontFamily={MONO_FONT}
          fontWeight={800}
          fill={TUE_RED}
        >
          BURST CLUSTER
        </text>
      </svg>
    );
  }

  // Step 2: Density Estimation (Continuous Signal Peak)
  if (stepIndex === 1) {
    const pathD = `M ${padX} ${height - 20} Q ${padX + 0.3 * plotW} ${height - 25}, ${padX + 0.4 * plotW} ${height - 65} T ${padX + 0.5 * plotW} 26 T ${padX + 0.6 * plotW} ${height - 65} Q ${padX + 0.7 * plotW} ${height - 25}, ${padX + plotW} ${height - 20}`;
    const areaD = `${pathD} L ${padX + plotW} ${height - 12} L ${padX} ${height - 12} Z`;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="diagDensityGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TUE_RED} stopOpacity={0.32} />
            <stop offset="100%" stopColor={TUE_RED} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Shaded Area */}
        <path d={areaD} fill="url(#diagDensityGrad2)" />

        {/* Density Curve Line */}
        <path
          d={pathD}
          fill="none"
          stroke={TUE_RED}
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Peak indicator dot & pulse */}
        <circle cx={padX + 0.5 * plotW} cy={26} r={10} fill={TUE_RED} opacity={0.2} />
        <circle cx={padX + 0.5 * plotW} cy={26} r={5} fill="#ffffff" stroke={TUE_RED} strokeWidth={2.5} />
        <circle cx={padX + 0.5 * plotW} cy={26} r={2.5} fill={TUE_RED} />

        {/* Peak Value Tag */}
        <text
          x={padX + 0.5 * plotW}
          y={15}
          textAnchor="middle"
          fontSize={10}
          fontFamily={MONO_FONT}
          fontWeight={800}
          fill={TUE_RED}
        >
          PEAK DENSITY ρ_max
        </text>

        {/* Baseline */}
        <line
          x1={padX}
          y1={height - 12}
          x2={padX + plotW}
          y2={height - 12}
          stroke="#0f172a"
          strokeWidth={2}
        />
      </svg>
    );
  }

  // Step 3: Weight Allocation with Floor Guarantee
  if (stepIndex === 2) {
    const bars = [
      { label: 'Δt₁', val: 28, isBurst: false },
      { label: 'Δt₂', val: 42, isBurst: false },
      { label: 'Δt₃', val: 96, isBurst: true },
      { label: 'Δt₄', val: 25, isBurst: false },
      { label: 'Δt₅', val: 48, isBurst: false },
    ];

    const barW = (plotW - 32) / 5;
    const floorY = height - 20 - (25 / 100) * (height - 60);

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Top Guarantee Label */}
        <text
          x={padX + 4}
          y={16}
          textAnchor="start"
          fontSize={9.5}
          fontFamily={MONO_FONT}
          fontWeight={800}
          fill="#8b5cf6"
        >
          - - - w_min FLOOR GUARANTEE
        </text>

        {/* Floor Guarantee Dashed Line */}
        <line
          x1={padX}
          y1={floorY}
          x2={padX + plotW}
          y2={floorY}
          stroke="#8b5cf6"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />

        {/* Allocation Bars */}
        {bars.map((bar, i) => {
          const x = padX + i * (barW + 8);
          const barH = (bar.val / 100) * (height - 60);
          const y = height - 20 - barH;

          return (
            <g key={`bar-${i}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                fill={bar.isBurst ? TUE_RED : '#8b5cf6'}
                opacity={bar.isBurst ? 0.95 : 0.8}
                rx={3}
              />
              <text
                x={x + barW / 2}
                y={height - 6}
                textAnchor="middle"
                fontSize={10}
                fontFamily={MONO_FONT}
                fontWeight={700}
                fill={MUTED_TEXT}
              >
                {bar.label}
              </text>
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize={9}
                fontFamily={MONO_FONT}
                fontWeight={800}
                fill={bar.isBurst ? TUE_RED : '#8b5cf6'}
              >
                w={bar.val}
              </text>
            </g>
          );
        })}

        {/* Baseline */}
        <line
          x1={padX}
          y1={height - 20}
          x2={padX + plotW}
          y2={height - 20}
          stroke="#0f172a"
          strokeWidth={2}
        />
      </svg>
    );
  }

  // Step 4: Coordinate Integration (Warped Output)
  const boundaries = [
    { x: padX, label: '12:00', showLabel: true },
    { x: padX + 0.12 * plotW, label: '13:00', showLabel: false },
    { x: padX + 0.26 * plotW, label: '14:00', showLabel: true },
    { x: padX + 0.74 * plotW, label: '15:00', showLabel: true },
    { x: padX + 0.88 * plotW, label: '16:00', showLabel: false },
    { x: padX + plotW, label: '17:00', showLabel: true },
  ];
  const burstWidth = boundaries[3].x - boundaries[2].x;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Expanded Burst Highlight Region */}
      <rect
        x={boundaries[2].x}
        y={height / 2 - 25}
        width={burstWidth}
        height={50}
        fill="rgba(16, 185, 129, 0.09)"
        stroke="#10b981"
        strokeWidth={1.5}
        rx={4}
      />

      {/* Baseline Bar */}
      <line
        x1={padX}
        y1={height / 2}
        x2={padX + plotW}
        y2={height / 2}
        stroke="#0f172a"
        strokeWidth={3}
        strokeLinecap="round"
      />

      {/* Warped Boundary Ticks */}
      {boundaries.map((b, i) => (
        <g key={`wb-${i}`}>
          <line
            x1={b.x}
            y1={height / 2 - 12}
            x2={b.x}
            y2={height / 2 + 12}
            stroke="#0f172a"
            strokeWidth={i === 0 || i === 5 ? 3 : 2}
          />
          {b.showLabel && (
            <text
              x={b.x}
              y={height / 2 + 28}
              textAnchor="middle"
              fontSize={10}
              fontFamily={MONO_FONT}
              fontWeight={800}
              fill={DARK_TEXT}
            >
              {b.label}
            </text>
          )}
        </g>
      ))}

      {/* Dispersed Burst Events inside interval 3 */}
      {Array.from({ length: 14 }).map((_, i) => (
        <circle
          key={`w-burst-dot-${i}`}
          cx={boundaries[2].x + 4 + (i / 13) * (burstWidth - 8)}
          cy={height / 2}
          r={4}
          fill={TUE_RED}
          stroke="#ffffff"
          strokeWidth={1}
        />
      ))}

      {/* Expansion Tag */}
      <text
        x={(boundaries[2].x + boundaries[3].x) / 2}
        y={height / 2 - 30}
        textAnchor="middle"
        fontSize={10}
        fontFamily={MONO_FONT}
        fontWeight={800}
        fill="#10b981"
      >
        EXPANDED DISPLAY SPACE
      </text>
    </svg>
  );
};
