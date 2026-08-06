---
created: 2026-08-06T11:29:17.245Z
title: Align dashboard compare heatmap to map
area: ui
severity: minor
files:
  - src/components/dashboard-demo/ComparisonKdeHeatmap.tsx
  - src/components/dashboard-demo/DemoCompareStage.tsx
  - src/components/dashboard-demo/lib/useDemoCompareData.ts
  - src/components/dashboard-demo/lib/compare-sparse-surfaces.ts
  - src/app/stkde-3d/components/Stkde3DScene.tsx
  - src/lib/coordinate-normalization.ts
---

## Problem

The Dashboard Demo compare view can now show A, B, and an optional A-B difference, but the user noted that a Chicago map underlay should align perfectly with the STKDE heatmap cells. During investigation, it became clear that both the STKDE data and the map use real geographic coordinates, but the compare rendering still needs one explicit transform between the dashboard normalization bounds and the STKDE map frame. The current map-underlay experiments were reverted, so the follow-up task is to implement a precise, minimal coordinate transform rather than crop, stretch, or visually nudge the map.

## Solution

Implement the map underlay only after defining one shared geographic frame for the compare heatmaps and the MapLibre background. Project each STKDE cell from its known lng/lat or normalized x/z into that exact frame, then render the map and heatmap into the same rectangle. Prefer a tiny affine transform with explicit scale and offset constants derived from known bounds or anchor points, rather than screenshot-based cropping or arbitrary CSS shifts.
