import React from 'react';
import { interpolate } from 'remotion';
import { FONT_FAMILY, MONO_FONT } from '../theme';
import { DARK_TEXT, MUTED_TEXT, TUE_RED } from './data';

// 10 fixed nodes arranged around a circle in an SVG canvas (220x160)
const GRAPH_NODES = [
  { id: 'n0', x: 110, y: 35 },
  { id: 'n1', x: 155, y: 50 },
  { id: 'n2', x: 180, y: 85 },
  { id: 'n3', x: 165, y: 125 },
  { id: 'n4', x: 125, y: 145 },
  { id: 'n5', x: 80, y: 140 },
  { id: 'n6', x: 50, y: 110 },
  { id: 'n7', x: 45, y: 70 },
  { id: 'n8', x: 75, y: 45 },
  { id: 'n9', x: 110, y: 90 }, // Center hub node
];

// 65 predefined edges distributed across the 10 nodes
export const ALL_NETWORK_EDGES: [number, number][] = [
  // Slice 1 uniform (2 edges)
  [0, 1], [1, 9],
  // Slice 2 uniform (6 edges)
  [2, 9], [3, 9], [4, 5], [5, 6], [6, 7], [7, 8],
  // Slice 3 uniform (48 burst edges connecting heavily through hub and cross-links)
  [0, 9], [1, 9], [2, 9], [3, 9], [4, 9], [5, 9], [6, 9], [7, 9], [8, 9],
  [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8],
  [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8],
  [2, 4], [2, 5], [2, 6], [2, 7], [2, 8],
  [3, 5], [3, 6], [3, 7], [3, 8],
  [4, 6], [4, 7], [4, 8],
  [5, 7], [5, 8],
  [6, 8],
  [0, 9], [1, 9], [2, 9], [3, 9], [4, 9], [5, 9], [6, 9], [7, 9], [8, 9],
  [2, 3], [5, 6],
  // Slice 4 uniform (2 edges)
  [8, 0], [0, 1],
  // Slice 5 uniform (7 edges)
  [1, 2], [2, 3], [3, 4], [4, 5], [5, 9], [6, 9], [7, 9],
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
  // Determine edge range for this slice in uniform vs non-uniform mode
  // Uniform edge slices: [0..2], [2..8], [8..56], [56..58], [58..65]
  const uniformRanges = [
    [0, 2],
    [2, 8],
    [8, 56],
    [56, 58],
    [58, 65],
  ];
  // Non-uniform edge slices: exactly 13 edges each [0..13], [13..26], [26..39], [39..52], [52..65]
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

  // Active edges to draw: interpolate between uniform list and non-uniform list
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

  // Active nodes (nodes connected to at least one edge)
  const activeNodeIndices = new Set<number>();
  currentEdges.forEach(([u, v]) => {
    activeNodeIndices.add(u);
    activeNodeIndices.add(v);
  });

  // Color scheme
  const edgeColor = isBurstInUniform ? 'rgba(200, 16, 46, 0.55)' : 'rgba(15, 23, 42, 0.45)';
  const nodeColor = isBurstInUniform ? TUE_RED : '#0f172a';

  return (
    <div
      style={{
        flex: 1,
        height: 250,
        backgroundColor: '#ffffff',
        border: isBurstInUniform ? '2px solid rgba(200, 16, 46, 0.5)' : '1.5px solid rgba(15, 23, 42, 0.15)',
        borderRadius: 12,
        padding: '12px 14px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: isBurstInUniform
          ? '0 6px 20px rgba(200, 16, 46, 0.15)'
          : '0 4px 14px rgba(0, 0, 0, 0.06)',
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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: isBurstInUniform ? TUE_RED : '#0f172a',
              color: '#ffffff',
              fontSize: 13,
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
              fontSize: 13,
              fontWeight: 750,
              fontFamily: MONO_FONT,
              color: DARK_TEXT,
            }}
          >
            {timeRange}
          </span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: isBurstInUniform ? TUE_RED : '#2563eb',
            backgroundColor: isBurstInUniform ? 'rgba(200, 16, 46, 0.1)' : 'rgba(37, 99, 235, 0.08)',
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          {duration}
        </span>
      </div>

      {/* 2. Body: SVG Dynamic Graph Snapshot */}
      <div
        style={{
          width: '100%',
          height: 155,
          backgroundColor: isBurstInUniform ? 'rgba(200, 16, 46, 0.03)' : 'rgba(15, 23, 42, 0.02)',
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <svg
          viewBox="0 0 220 160"
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
                strokeWidth={isBurstInUniform ? 1.8 : 1.5}
              />
            );
          })}

          {/* Nodes */}
          {GRAPH_NODES.map((node, nIdx) => {
            const isActive = activeNodeIndices.has(nIdx);
            return (
              <circle
                key={`node-${sliceIndex}-${nIdx}`}
                cx={node.x}
                cy={node.y}
                r={nIdx === 9 ? 6 : 4.5}
                fill={isActive ? nodeColor : '#cbd5e1'}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            );
          })}
        </svg>

        {/* Burst Warning Overlay in Uniform State */}
        {isBurstInUniform && (
          <div
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              fontSize: 10,
              fontWeight: 800,
              color: TUE_RED,
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              border: `1px solid ${TUE_RED}`,
              padding: '2px 6px',
              borderRadius: 4,
              fontFamily: MONO_FONT,
            }}
          >
            Hairball (Clutter)
          </div>
        )}
      </div>

      {/* 3. Footer: Edge Complexity Count */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 11,
          fontFamily: MONO_FONT,
          color: MUTED_TEXT,
          fontWeight: 650,
        }}
      >
        <span>
          {isBurstInUniform ? 'Complexity: Extreme' : progress > 0.5 ? 'Complexity: Balanced' : 'Complexity: Low'}
        </span>
        <span
          style={{
            color: isBurstInUniform ? TUE_RED : DARK_TEXT,
            fontWeight: 800,
          }}
        >
          {edgeCount} edges
        </span>
      </div>
    </div>
  );
};
