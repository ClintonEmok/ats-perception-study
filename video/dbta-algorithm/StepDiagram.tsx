import React from 'react';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DARK_TEXT, MUTED_TEXT, TUE_RED } from './data';

interface StepDiagramProps {
  stepIndex: number; // 0, 1, 2, 3, 4
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
  const padX = 22;
  const plotW = width - 2 * padX;

  // Step 0: Raw Event Stream (Continuous Unbinned Timestamps)
  if (stepIndex === 0) {
    const burstStart = padX + 0.4 * plotW;
    const burstW = 0.2 * plotW;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Burst Overlap Box */}
        <rect
          x={burstStart}
          y={height / 2 - 20}
          width={burstW}
          height={40}
          fill="rgba(200, 16, 46, 0.08)"
          stroke={TUE_RED}
          strokeWidth={1.5}
          strokeDasharray="3 3"
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

        {/* Start & End Ticks */}
        <line x1={padX} y1={height / 2 - 10} x2={padX} y2={height / 2 + 10} stroke="#0f172a" strokeWidth={2.5} />
        <line x1={padX + plotW} y1={height / 2 - 10} x2={padX + plotW} y2={height / 2 + 10} stroke="#0f172a" strokeWidth={2.5} />

        <text x={padX} y={height / 2 + 25} textAnchor="middle" fontSize={9.5} fontFamily={MONO_FONT} fontWeight={800} fill={DARK_TEXT}>
          12:00
        </text>
        <text x={padX + plotW} y={height / 2 + 25} textAnchor="middle" fontSize={9.5} fontFamily={MONO_FONT} fontWeight={800} fill={DARK_TEXT}>
          17:00
        </text>

        {/* Scattered Event Dots */}
        <circle cx={padX + 0.08 * plotW} cy={height / 2} r={3.5} fill="#0f172a" />
        <circle cx={padX + 0.16 * plotW} cy={height / 2} r={3.5} fill="#0f172a" />
        <circle cx={padX + 0.25 * plotW} cy={height / 2} r={3.5} fill="#0f172a" />
        <circle cx={padX + 0.32 * plotW} cy={height / 2} r={3.5} fill="#0f172a" />
        <circle cx={padX + 0.37 * plotW} cy={height / 2} r={3.5} fill="#0f172a" />

        {/* Burst Overplotting Dots */}
        {Array.from({ length: 12 }).map((_, i) => (
          <circle
            key={`raw-d-${i}`}
            cx={burstStart + 2 + (i / 11) * (burstW - 4)}
            cy={height / 2}
            r={3.5}
            fill={TUE_RED}
            stroke="#ffffff"
            strokeWidth={0.8}
          />
        ))}

        <circle cx={padX + 0.72 * plotW} cy={height / 2} r={3.5} fill="#0f172a" />
        <circle cx={padX + 0.84 * plotW} cy={height / 2} r={3.5} fill="#0f172a" />
        <circle cx={padX + 0.92 * plotW} cy={height / 2} r={3.5} fill="#0f172a" />

        <text x={burstStart + burstW / 2} y={height / 2 - 25} textAnchor="middle" fontSize={9} fontFamily={MONO_FONT} fontWeight={800} fill={TUE_RED}>
          OCCLUSION
        </text>
      </svg>
    );
  }

  // Step 1: Hourly Binning (Domain Discretization)
  if (stepIndex === 1) {
    const ticks = [0, 1, 2, 3, 4, 5];
    const sliceW = plotW / 5;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Interval 2 (Burst) Highlight Box */}
        <rect
          x={padX + 2 * sliceW}
          y={height / 2 - 22}
          width={sliceW}
          height={44}
          fill="rgba(37, 99, 235, 0.08)"
          stroke="#2563eb"
          strokeWidth={1.5}
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

        {/* Hourly Interval Ticks */}
        {ticks.map((t) => {
          const x = padX + t * sliceW;
          return (
            <g key={`t-${t}`}>
              <line
                x1={x}
                y1={height / 2 - 10}
                x2={x}
                y2={height / 2 + 10}
                stroke="#0f172a"
                strokeWidth={1.8}
              />
              <text
                x={x}
                y={height / 2 + 25}
                textAnchor="middle"
                fontSize={9}
                fontFamily={MONO_FONT}
                fontWeight={800}
                fill={DARK_TEXT}
              >
                {t === 0 ? '12h' : t === 5 ? '17h' : `+${t}h`}
              </text>
            </g>
          );
        })}

        {/* Event dots inside intervals */}
        <circle cx={padX + 0.3 * sliceW} cy={height / 2} r={3.5} fill="#0f172a" />
        <circle cx={padX + 0.7 * sliceW} cy={height / 2} r={3.5} fill="#0f172a" />

        <circle cx={padX + 1.3 * sliceW} cy={height / 2} r={3.5} fill="#0f172a" />
        <circle cx={padX + 1.7 * sliceW} cy={height / 2} r={3.5} fill="#0f172a" />

        {Array.from({ length: 12 }).map((_, i) => (
          <circle
            key={`burst-dot-${i}`}
            cx={padX + 2 * sliceW + 2 + (i / 11) * (sliceW - 4)}
            cy={height / 2}
            r={3.5}
            fill={TUE_RED}
            stroke="#ffffff"
            strokeWidth={0.8}
          />
        ))}

        <circle cx={padX + 3.5 * sliceW} cy={height / 2} r={3.5} fill="#0f172a" />
        <circle cx={padX + 4.4 * sliceW} cy={height / 2} r={3.5} fill="#0f172a" />
        <circle cx={padX + 4.8 * sliceW} cy={height / 2} r={3.5} fill="#0f172a" />

        <text
          x={padX + 2.5 * sliceW}
          y={height / 2 - 27}
          textAnchor="middle"
          fontSize={9}
          fontFamily={MONO_FONT}
          fontWeight={800}
          fill="#2563eb"
        >
          Δt = 1 HOUR
        </text>
      </svg>
    );
  }

  // Step 2: Density Estimation (Continuous Signal Peak)
  if (stepIndex === 2) {
    const pathD = `M ${padX} ${height - 18} Q ${padX + 0.3 * plotW} ${height - 22}, ${padX + 0.4 * plotW} ${height - 55} T ${padX + 0.5 * plotW} 24 T ${padX + 0.6 * plotW} ${height - 55} Q ${padX + 0.7 * plotW} ${height - 22}, ${padX + plotW} ${height - 18}`;
    const areaD = `${pathD} L ${padX + plotW} ${height - 12} L ${padX} ${height - 12} Z`;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="diagDensityGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TUE_RED} stopOpacity={0.32} />
            <stop offset="100%" stopColor={TUE_RED} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <path d={areaD} fill="url(#diagDensityGrad2)" />
        <path d={pathD} fill="none" stroke={TUE_RED} strokeWidth={2.5} strokeLinecap="round" />

        <circle cx={padX + 0.5 * plotW} cy={24} r={8} fill={TUE_RED} opacity={0.2} />
        <circle cx={padX + 0.5 * plotW} cy={24} r={4.5} fill="#ffffff" stroke={TUE_RED} strokeWidth={2} />

        <text
          x={padX + 0.5 * plotW}
          y={14}
          textAnchor="middle"
          fontSize={9}
          fontFamily={MONO_FONT}
          fontWeight={800}
          fill={TUE_RED}
        >
          PEAK ρ_max
        </text>

        <line x1={padX} y1={height - 12} x2={padX + plotW} y2={height - 12} stroke="#0f172a" strokeWidth={2} />
      </svg>
    );
  }

  // Step 3: Conserved Space Redistribution (Up/Down from 20% Baseline)
  if (stepIndex === 3) {
    const bars = [
      { label: 'Δt₁', share: 11.2, isBurst: false },
      { label: 'Δt₂', share: 14.4, isBurst: false },
      { label: 'Δt₃', share: 48.0, isBurst: true },
      { label: 'Δt₄', share: 11.2, isBurst: false },
      { label: 'Δt₅', share: 15.2, isBurst: false },
    ];

    const barW = (plotW - 28) / 5;
    const maxPlotH = height - 48;
    const uniformH = (20.0 / 50.0) * maxPlotH;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <line
          x1={padX}
          y1={height - 18 - uniformH}
          x2={padX + plotW}
          y2={height - 18 - uniformH}
          stroke="#94a3b8"
          strokeWidth={1.2}
          strokeDasharray="3 2"
        />

        {bars.map((bar, i) => {
          const x = padX + i * (barW + 7);
          const barH = (bar.share / 50.0) * maxPlotH;
          const y = height - 18 - barH;

          return (
            <g key={`realloc-bar-${i}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                fill={bar.isBurst ? TUE_RED : '#8b5cf6'}
                rx={2.5}
              />
              <text
                x={x + barW / 2}
                y={height - 6}
                textAnchor="middle"
                fontSize={9}
                fontFamily={MONO_FONT}
                fontWeight={700}
                fill={MUTED_TEXT}
              >
                {bar.label}
              </text>
              <text
                x={x + barW / 2}
                y={y - 3}
                textAnchor="middle"
                fontSize={8.5}
                fontFamily={MONO_FONT}
                fontWeight={800}
                fill={bar.isBurst ? TUE_RED : DARK_TEXT}
              >
                {bar.share.toFixed(0)}%
              </text>
            </g>
          );
        })}

        <line x1={padX} y1={height - 18} x2={padX + plotW} y2={height - 18} stroke="#0f172a" strokeWidth={2} />
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
      <rect
        x={boundaries[2].x}
        y={height / 2 - 20}
        width={burstWidth}
        height={40}
        fill="rgba(16, 185, 129, 0.09)"
        stroke="#10b981"
        strokeWidth={1.5}
        rx={4}
      />

      <line
        x1={padX}
        y1={height / 2}
        x2={padX + plotW}
        y2={height / 2}
        stroke="#0f172a"
        strokeWidth={3}
        strokeLinecap="round"
      />

      {boundaries.map((b, i) => (
        <g key={`wb-${i}`}>
          <line
            x1={b.x}
            y1={height / 2 - 10}
            x2={b.x}
            y2={height / 2 + 10}
            stroke="#0f172a"
            strokeWidth={i === 0 || i === 5 ? 2.5 : 1.8}
          />
          {b.showLabel && (
            <text
              x={b.x}
              y={height / 2 + 25}
              textAnchor="middle"
              fontSize={9}
              fontFamily={MONO_FONT}
              fontWeight={800}
              fill={DARK_TEXT}
            >
              {b.label}
            </text>
          )}
        </g>
      ))}

      {Array.from({ length: 12 }).map((_, i) => (
        <circle
          key={`w-burst-dot-${i}`}
          cx={boundaries[2].x + 3 + (i / 11) * (burstWidth - 6)}
          cy={height / 2}
          r={3.5}
          fill={TUE_RED}
          stroke="#ffffff"
          strokeWidth={0.8}
        />
      ))}

      <text
        x={(boundaries[2].x + boundaries[3].x) / 2}
        y={height / 2 - 25}
        textAnchor="middle"
        fontSize={9}
        fontFamily={MONO_FONT}
        fontWeight={800}
        fill="#10b981"
      >
        EXPANDED
      </text>
    </svg>
  );
};
