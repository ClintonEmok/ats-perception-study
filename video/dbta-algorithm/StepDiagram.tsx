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

  // Step 3: Proportional Weight Allocation (Base 1.0 + Proportional Scaling across all bins)
  if (stepIndex === 2) {
    const bars = [
      { label: 'Δt₁', bonus: 0.17, isBurst: false },
      { label: 'Δt₂', bonus: 0.5, isBurst: false },
      { label: 'Δt₃', bonus: 4.0, isBurst: true },
      { label: 'Δt₄', bonus: 0.17, isBurst: false },
      { label: 'Δt₅', bonus: 0.58, isBurst: false },
    ];

    const barW = (plotW - 32) / 5;
    const baseH = 22;
    const maxBonusH = height - 58;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Base 1.0 Benchmark Line */}
        <line
          x1={padX}
          y1={height - 20 - baseH}
          x2={padX + plotW}
          y2={height - 20 - baseH}
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />

        {/* Stacked Allocation Bars */}
        {bars.map((bar, i) => {
          const x = padX + i * (barW + 8);
          const bonusH = (bar.bonus / 4.0) * maxBonusH;
          const yBase = height - 20 - baseH;
          const yBonus = yBase - bonusH;

          return (
            <g key={`bar-${i}`}>
              {/* Top Density Bonus */}
              {bonusH > 2 && (
                <rect
                  x={x}
                  y={yBonus}
                  width={barW}
                  height={bonusH}
                  fill={bar.isBurst ? TUE_RED : '#8b5cf6'}
                  opacity={0.95}
                  rx={2}
                />
              )}

              {/* Bottom Base 1.0 Floor */}
              <rect
                x={x}
                y={yBase}
                width={barW}
                height={baseH}
                fill="#3b82f6"
                opacity={0.9}
                rx={2}
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
                y={yBonus - 4}
                textAnchor="middle"
                fontSize={9}
                fontFamily={MONO_FONT}
                fontWeight={800}
                fill={bar.isBurst ? TUE_RED : DARK_TEXT}
              >
                w={(1.0 + bar.bonus).toFixed(1)}
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
    { x: padX + 0.112 * plotW, label: '13:00', showLabel: false },
    { x: padX + 0.256 * plotW, label: '14:00', showLabel: true },
    { x: padX + 0.736 * plotW, label: '15:00', showLabel: true },
    { x: padX + 0.848 * plotW, label: '16:00', showLabel: false },
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
