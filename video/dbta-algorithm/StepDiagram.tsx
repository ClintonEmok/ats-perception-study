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
  const padX = 18;
  const plotW = width - 2 * padX;
  const midY = height / 2;

  // Step 0: Event Sequence (Continuous Unbinned Timestamps)
  if (stepIndex === 0) {
    const burstStart = padX + 0.4 * plotW;
    const burstW = 0.2 * plotW;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <rect
          x={burstStart}
          y={midY - 26}
          width={burstW}
          height={52}
          fill="rgba(200, 16, 46, 0.08)"
          stroke={TUE_RED}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          rx={6}
        />

        <line
          x1={padX}
          y1={midY}
          x2={padX + plotW}
          y2={midY}
          stroke="#0f172a"
          strokeWidth={3.5}
          strokeLinecap="round"
        />

        <line x1={padX} y1={midY - 14} x2={padX} y2={midY + 14} stroke="#0f172a" strokeWidth={3} />
        <line x1={padX + plotW} y1={midY - 14} x2={padX + plotW} y2={midY + 14} stroke="#0f172a" strokeWidth={3} />

        <text x={padX} y={midY + 30} textAnchor="middle" fontSize={11} fontFamily={MONO_FONT} fontWeight={800} fill={DARK_TEXT}>
          12:00
        </text>
        <text x={padX + plotW} y={midY + 30} textAnchor="middle" fontSize={11} fontFamily={MONO_FONT} fontWeight={800} fill={DARK_TEXT}>
          17:00
        </text>

        <circle cx={padX + 0.08 * plotW} cy={midY} r={4.5} fill="#0f172a" />
        <circle cx={padX + 0.16 * plotW} cy={midY} r={4.5} fill="#0f172a" />
        <circle cx={padX + 0.25 * plotW} cy={midY} r={4.5} fill="#0f172a" />
        <circle cx={padX + 0.32 * plotW} cy={midY} r={4.5} fill="#0f172a" />
        <circle cx={padX + 0.37 * plotW} cy={midY} r={4.5} fill="#0f172a" />

        {Array.from({ length: 12 }).map((_, i) => (
          <circle
            key={`raw-d-${i}`}
            cx={burstStart + 3 + (i / 11) * (burstW - 6)}
            cy={midY}
            r={4.5}
            fill={TUE_RED}
            stroke="#ffffff"
            strokeWidth={1}
          />
        ))}

        <circle cx={padX + 0.72 * plotW} cy={midY} r={4.5} fill="#0f172a" />
        <circle cx={padX + 0.84 * plotW} cy={midY} r={4.5} fill="#0f172a" />
        <circle cx={padX + 0.92 * plotW} cy={midY} r={4.5} fill="#0f172a" />

        <text x={burstStart + burstW / 2} y={midY - 32} textAnchor="middle" fontSize={11} fontFamily={MONO_FONT} fontWeight={800} fill={TUE_RED}>
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
        <rect
          x={padX + 2 * sliceW}
          y={midY - 26}
          width={sliceW}
          height={52}
          fill="rgba(37, 99, 235, 0.08)"
          stroke="#2563eb"
          strokeWidth={1.5}
          rx={6}
        />

        <line
          x1={padX}
          y1={midY}
          x2={padX + plotW}
          y2={midY}
          stroke="#0f172a"
          strokeWidth={3.5}
          strokeLinecap="round"
        />

        {ticks.map((t) => {
          const x = padX + t * sliceW;
          return (
            <g key={`t-${t}`}>
              <line
                x1={x}
                y1={midY - 14}
                x2={x}
                y2={midY + 14}
                stroke="#0f172a"
                strokeWidth={2.2}
              />
              <text
                x={x}
                y={midY + 30}
                textAnchor="middle"
                fontSize={10.5}
                fontFamily={MONO_FONT}
                fontWeight={800}
                fill={DARK_TEXT}
              >
                {t === 0 ? '12h' : t === 5 ? '17h' : `+${t}h`}
              </text>
            </g>
          );
        })}

        <circle cx={padX + 0.3 * sliceW} cy={midY} r={4.5} fill="#0f172a" />
        <circle cx={padX + 0.7 * sliceW} cy={midY} r={4.5} fill="#0f172a" />
        <circle cx={padX + 1.3 * sliceW} cy={midY} r={4.5} fill="#0f172a" />
        <circle cx={padX + 1.7 * sliceW} cy={midY} r={4.5} fill="#0f172a" />

        {Array.from({ length: 12 }).map((_, i) => (
          <circle
            key={`burst-dot-${i}`}
            cx={padX + 2 * sliceW + 3 + (i / 11) * (sliceW - 6)}
            cy={midY}
            r={4.5}
            fill={TUE_RED}
            stroke="#ffffff"
            strokeWidth={1}
          />
        ))}

        <circle cx={padX + 3.5 * sliceW} cy={midY} r={4.5} fill="#0f172a" />
        <circle cx={padX + 4.4 * sliceW} cy={midY} r={4.5} fill="#0f172a" />
        <circle cx={padX + 4.8 * sliceW} cy={midY} r={4.5} fill="#0f172a" />

        <text
          x={padX + 2.5 * sliceW}
          y={midY - 33}
          textAnchor="middle"
          fontSize={11}
          fontFamily={MONO_FONT}
          fontWeight={800}
          fill="#2563eb"
        >
          Δt = 1 HOUR
        </text>
      </svg>
    );
  }

  // Step 2: Event Frequency (Activity Measurement)
  if (stepIndex === 2) {
    const bars = [
      { label: 'Δt₁', count: 2, isBurst: false },
      { label: 'Δt₂', count: 6, isBurst: false },
      { label: 'Δt₃', count: 48, isBurst: true },
      { label: 'Δt₄', count: 2, isBurst: false },
      { label: 'Δt₅', count: 7, isBurst: false },
    ];

    const barW = (plotW - 28) / 5;
    const baselineY = height - 28;
    const maxPlotH = height - 68;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {bars.map((bar, i) => {
          const x = padX + i * (barW + 7);
          const barH = (bar.count / 48) * maxPlotH;
          const y = baselineY - barH;

          return (
            <g key={`freq-bar-${i}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                fill={bar.isBurst ? TUE_RED : 'rgba(71, 85, 105, 0.18)'}
                stroke={bar.isBurst ? TUE_RED : '#64748b'}
                strokeWidth={1.2}
                rx={4}
              />
              <text
                x={x + barW / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize={11}
                fontFamily={MONO_FONT}
                fontWeight={700}
                fill={MUTED_TEXT}
              >
                {bar.label}
              </text>
              <text
                x={x + barW / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize={10.5}
                fontFamily={MONO_FONT}
                fontWeight={800}
                fill={bar.isBurst ? TUE_RED : DARK_TEXT}
              >
                N={bar.count}
              </text>
            </g>
          );
        })}

        <line x1={padX} y1={baselineY} x2={padX + plotW} y2={baselineY} stroke="#0f172a" strokeWidth={2.5} />
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
    const baselineY = height - 28;
    const maxPlotH = height - 68;
    const uniformH = (20.0 / 50.0) * maxPlotH;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <line
          x1={padX}
          y1={baselineY - uniformH}
          x2={padX + plotW}
          y2={baselineY - uniformH}
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />

        {bars.map((bar, i) => {
          const x = padX + i * (barW + 7);
          const barH = (bar.share / 50.0) * maxPlotH;
          const y = baselineY - barH;

          return (
            <g key={`realloc-bar-${i}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                fill={bar.isBurst ? TUE_RED : '#8b5cf6'}
                rx={4}
              />
              <text
                x={x + barW / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize={11}
                fontFamily={MONO_FONT}
                fontWeight={700}
                fill={MUTED_TEXT}
              >
                {bar.label}
              </text>
              <text
                x={x + barW / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize={10.5}
                fontFamily={MONO_FONT}
                fontWeight={800}
                fill={bar.isBurst ? TUE_RED : DARK_TEXT}
              >
                {bar.share.toFixed(0)}%
              </text>
            </g>
          );
        })}

        <line x1={padX} y1={baselineY} x2={padX + plotW} y2={baselineY} stroke="#0f172a" strokeWidth={2.5} />
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
        y={midY - 26}
        width={burstWidth}
        height={52}
        fill="rgba(16, 185, 129, 0.09)"
        stroke="#10b981"
        strokeWidth={1.8}
        rx={6}
      />

      <line
        x1={padX}
        y1={midY}
        x2={padX + plotW}
        y2={midY}
        stroke="#0f172a"
        strokeWidth={3.5}
        strokeLinecap="round"
      />

      {boundaries.map((b, i) => (
        <g key={`wb-${i}`}>
          <line
            x1={b.x}
            y1={midY - 14}
            x2={b.x}
            y2={midY + 14}
            stroke="#0f172a"
            strokeWidth={i === 0 || i === 5 ? 3 : 2.2}
          />
          {b.showLabel && (
            <text
              x={b.x}
              y={midY + 30}
              textAnchor="middle"
              fontSize={11}
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
          cx={boundaries[2].x + 4 + (i / 11) * (burstWidth - 8)}
          cy={midY}
          r={4.5}
          fill={TUE_RED}
          stroke="#ffffff"
          strokeWidth={1}
        />
      ))}

      <text
        x={(boundaries[2].x + boundaries[3].x) / 2}
        y={midY - 33}
        textAnchor="middle"
        fontSize={11}
        fontFamily={MONO_FONT}
        fontWeight={800}
        fill="#10b981"
      >
        EXPANDED
      </text>
    </svg>
  );
};
