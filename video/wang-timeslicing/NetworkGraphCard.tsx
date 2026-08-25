import React from 'react';
import { interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DARK_TEXT, MUTED_TEXT, TUE_RED } from './data';

// 12 nodes arranged organically in an SVG canvas (320x420)
const GRAPH_NODES = [
  { id: 'n0', x: 160, y: 45, label: 'A' },
  { id: 'n1', x: 250, y: 85, label: 'B' },
  { id: 'n2', x: 285, y: 175, label: 'C' },
  { id: 'n3', x: 275, y: 275, label: 'D' },
  { id: 'n4', x: 230, y: 355, label: 'E' },
  { id: 'n5', x: 160, y: 395, label: 'F' },
  { id: 'n6', x: 90, y: 355, label: 'G' },
  { id: 'n7', x: 45, y: 275, label: 'H' },
  { id: 'n8', x: 35, y: 175, label: 'I' },
  { id: 'n9', x: 70, y: 85, label: 'J' },
  { id: 'n10', x: 125, y: 200, label: 'K' }, // Internal hub 1
  { id: 'n11', x: 195, y: 240, label: 'L' }, // Internal hub 2
];

// 65 predefined edges distributed across the 12 nodes
export const ALL_NETWORK_EDGES: [number, number][] = [
  // Slice 1 uniform (2 edges)
  [0, 1], [1, 10],
  // Slice 2 uniform (6 edges)
  [2, 11], [3, 11], [4, 5], [5, 6], [6, 7], [7, 8],
  // Slice 3 uniform (48 burst edges connecting heavily through hubs and cross-links)
  [0, 10], [1, 10], [2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10],
  [0, 11], [1, 11], [2, 11], [3, 11], [4, 11], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11],
  [10, 11], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8],
  [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8],
  [2, 4], [2, 5], [2, 6], [2, 7], [2, 8],
  [3, 5], [3, 6], [3, 7], [3, 8],
  [4, 6], [4, 7], [4, 8],
  [5, 7], [5, 8],
  [6, 8],
  [0, 10], [1, 11],
  // Slice 4 uniform (2 edges)
  [8, 0], [0, 1],
  // Slice 5 uniform (7 edges)
  [1, 2], [2, 3], [3, 4], [4, 5], [5, 10], [6, 11], [7, 10],
];

interface NetworkGraphCardProps {
  sliceIndex: number;
  progress: number; // 0 = uniform, 1 = non-uniform
  timeRange: string;
  duration: string;
}

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export const NetworkGraphCard: React.FC<NetworkGraphCardProps> = ({
  sliceIndex,
  progress,
  timeRange,
  duration,
}) => {
  const uniformRanges = [
    [0, 2],
    [2, 8],
    [8, 56],
    [56, 58],
    [58, 65],
  ];
  const nonUniformRanges = [
    [0, 13],
    [13, 26],
    [26, 39],
    [39, 52],
    [52, 65],
  ];

  const uCount = uniformRanges[sliceIndex][1] - uniformRanges[sliceIndex][0];
  const wCount = nonUniformRanges[sliceIndex][1] - nonUniformRanges[sliceIndex][0];
  const edgeCount = Math.round(interpolate(progress, [0, 1], [uCount, wCount], clamp));

  const isBurstInUniform = sliceIndex === 2 && progress < 0.5;

  const startIdx = Math.round(
    interpolate(
      progress,
      [0, 1],
      [uniformRanges[sliceIndex][0], nonUniformRanges[sliceIndex][0]],
      clamp
    )
  );
  const endIdx = startIdx + edgeCount;
  const currentEdges = ALL_NETWORK_EDGES.slice(startIdx, endIdx);

  const activeNodeIndices = new Set<number>();
  currentEdges.forEach(([u, v]) => {
    activeNodeIndices.add(u);
    activeNodeIndices.add(v);
  });

  const edgeColor = isBurstInUniform ? 'rgba(200, 16, 46, 0.65)' : 'rgba(15, 23, 42, 0.45)';
  const nodeColor = isBurstInUniform ? TUE_RED : '#0f172a';

  return (
    <div
      style={{
        flex: 1,
        height: 560,
        backgroundColor: '#ffffff',
        border: isBurstInUniform
          ? '2.5px solid rgba(200, 16, 46, 0.6)'
          : '1.5px solid rgba(15, 23, 42, 0.16)',
        borderRadius: 14,
        padding: '16px 18px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: isBurstInUniform
          ? '0 10px 30px rgba(200, 16, 46, 0.18)'
          : '0 6px 20px rgba(0, 0, 0, 0.06)',
        position: 'relative',
        fontFamily: FONT_FAMILY,
        userSelect: 'none',
      }}
    >
      {/* 1. Header: Badge & Time Range */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          paddingBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: isBurstInUniform ? TUE_RED : '#0f172a',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: MONO_FONT,
            }}
          >
            {sliceIndex + 1}
          </div>
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              fontFamily: MONO_FONT,
              color: DARK_TEXT,
            }}
          >
            {timeRange}
          </span>
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 750,
            color: isBurstInUniform ? TUE_RED : '#2563eb',
            backgroundColor: isBurstInUniform ? 'rgba(200, 16, 46, 0.1)' : 'rgba(37, 99, 235, 0.08)',
            padding: '3px 8px',
            borderRadius: 6,
          }}
        >
          {duration}
        </span>
      </div>

      {/* 2. Body: Large SVG Dynamic Graph Snapshot (Height 420px) */}
      <div
        style={{
          width: '100%',
          flex: 1,
          margin: '10px 0',
          backgroundColor: isBurstInUniform ? 'rgba(200, 16, 46, 0.03)' : 'rgba(15, 23, 42, 0.02)',
          borderRadius: 10,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <svg
          viewBox="0 0 320 440"
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          {/* Edges */}
          {currentEdges.map(([u, v], eIdx) => {
            const nodeU = GRAPH_NODES[u];
            const nodeV = GRAPH_NODES[v];
            return (
              <line
                key={`edge-${sliceIndex}-${eIdx}`}
                x1={nodeU.x}
                y1={nodeU.y}
                x2={nodeV.x}
                y2={nodeV.y}
                stroke={edgeColor}
                strokeWidth={isBurstInUniform ? 2.2 : 1.8}
              />
            );
          })}

          {/* Nodes */}
          {GRAPH_NODES.map((node, nIdx) => {
            const isActive = activeNodeIndices.has(nIdx);
            const isHub = nIdx >= 10;
            return (
              <g key={`node-group-${sliceIndex}-${nIdx}`}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isHub ? 8.5 : 6.5}
                  fill={isActive ? nodeColor : '#cbd5e1'}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              </g>
            );
          })}
        </svg>

        {/* Burst Warning Overlay in Uniform State */}
        {isBurstInUniform && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              fontSize: 12,
              fontWeight: 850,
              color: TUE_RED,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: `1.5px solid ${TUE_RED}`,
              padding: '3px 8px',
              borderRadius: 6,
              fontFamily: MONO_FONT,
              boxShadow: '0 2px 8px rgba(200, 16, 46, 0.2)',
            }}
          >
            ⚠️ Hairball Clutter
          </div>
        )}
      </div>

      {/* 3. Footer: Edge Complexity Count */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          fontFamily: MONO_FONT,
          color: MUTED_TEXT,
          fontWeight: 700,
          borderTop: '1px solid rgba(15, 23, 42, 0.08)',
          paddingTop: 8,
        }}
      >
        <span>
          {isBurstInUniform
            ? 'Complexity: Overloaded'
            : progress > 0.5
            ? 'Complexity: Balanced'
            : 'Complexity: Sparse'}
        </span>
        <span
          style={{
            color: isBurstInUniform ? TUE_RED : DARK_TEXT,
            fontWeight: 850,
            fontSize: 13,
          }}
        >
          {edgeCount} edges
        </span>
      </div>
    </div>
  );
};
