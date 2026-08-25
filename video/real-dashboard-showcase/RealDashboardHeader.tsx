import React from 'react';
import { Box, CheckCircle2, ChevronDown, Flame, GitCompareArrows, Layers, Map, MapPin, Sparkles } from 'lucide-react';
import { FONT_FAMILY, MONO_FONT } from '../theme';

export function RealDashboardHeader({
  cubeActive = false,
  topDownActive = false,
  badgeText = '',
  badgeTitle = '',
  badgeColor = '#2563eb',
  badgeOpacity = 0,
}: {
  cubeActive?: boolean;
  topDownActive?: boolean;
  badgeText?: string;
  badgeTitle?: string;
  badgeColor?: string;
  badgeOpacity?: number;
}) {
  return (
    <header
      style={{
        position: 'absolute',
        left: 24,
        top: 18,
        right: 24,
        height: 62,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 18px',
        borderRadius: 12,
        background: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.36)',
        zIndex: 50,
        fontFamily: FONT_FAMILY,
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Left: Case Study Preset Select Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 8,
            padding: '7px 12px',
            color: '#f8fafc',
            fontSize: 12,
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          <Sparkles style={{ width: 14, height: 14, color: '#38bdf8' }} />
          <span>Chicago Crime Burst · July 28 – Aug 4, 2025</span>
          <ChevronDown style={{ width: 13, height: 13, color: '#94a3b8' }} />
        </div>

        {/* Sync Status Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 7,
            padding: '5px 10px',
            color: '#34d399',
            fontSize: 10,
            fontFamily: MONO_FONT,
            fontWeight: 800,
            letterSpacing: 0.8,
          }}
        >
          <CheckCircle2 style={{ width: 12, height: 12 }} />
          <span>SYNCHRONIZED</span>
        </div>
      </div>

      {/* 2. Center: Chapter Narrative Explanation Chip */}
      <div
        style={{
          opacity: badgeOpacity,
          transform: `scale(${0.95 + badgeOpacity * 0.05})`,
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
          padding: '6px 20px',
          borderRadius: 8,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{
            color: badgeColor,
            fontSize: 9.5,
            fontWeight: 850,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            fontFamily: MONO_FONT,
          }}
        >
          {badgeText}
        </div>
        <div style={{ color: '#ffffff', fontSize: 13.5, fontWeight: 750, marginTop: 2 }}>
          {badgeTitle}
        </div>
      </div>

      {/* 3. Right: Viewport Mode Switcher (Map / 3D STKDE / Compare) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            padding: 3,
          }}
        >
          {[
            { id: 'map', label: 'Map View', icon: Map, active: !cubeActive },
            {
              id: '3d',
              label: topDownActive ? 'STKDE Top-Down' : '3D STKDE Cube',
              icon: Box,
              active: cubeActive,
            },
            { id: 'compare', label: 'Compare', icon: GitCompareArrows, active: false },
          ].map(({ id, label, icon: Icon, active }) => (
            <div
              key={id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 750,
                fontFamily: FONT_FAMILY,
                background: active ? '#2563eb' : 'transparent',
                color: active ? '#ffffff' : '#94a3b8',
                boxShadow: active ? '0 2px 8px rgba(37, 99, 235, 0.4)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon style={{ width: 13, height: 13 }} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Layer Toggles (POI, Flame, Heatmap) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
            }}
          >
            <MapPin style={{ width: 14, height: 14 }} />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 10px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: 11,
              fontWeight: 800,
              fontFamily: MONO_FONT,
            }}
          >
            <Flame style={{ width: 13, height: 13 }} />
            <span>STKDE</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#38bdf8',
            }}
          >
            <Layers style={{ width: 14, height: 14 }} />
          </div>
        </div>
      </div>
    </header>
  );
}
