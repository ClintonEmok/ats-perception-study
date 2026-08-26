---
name: remotion-algorithm-animation
description: >-
  Expert blueprint and runbook for crafting production-grade, mathematically accurate Remotion motion graphics,
  algorithm explainers, and presentation-ready academic animations in React.
  Use when designing, animating, structuring, or rendering technical algorithm videos, dynamic data visualization animations,
  keyframe presentation stills, or high-fidelity motion graphics.
---

# Remotion Algorithm & Technical Visualization Skill

This skill provides the end-to-end framework, mathematical guidelines, motion design principles, and rendering configurations for creating high-impact, presentation-grade algorithm animations using Remotion and React.

---

## 1. Architectural Pipeline: 3-Level Hierarchy

Every technical algorithm animation should follow a clean 3-level component architecture:

```text
┌────────────────────────────────────────────────────────┐
│ 1. Master Container (Composition Orchestrator)         │
│    - Global timeline clock (frames, fps, total seconds)│
│    - Top Stepper navigation (Active / Past / Upcoming) │
│    - Cross-fading Hero Stages                          │
└───────────────────────────┬────────────────────────────┘
                            │
       ┌────────────────────┴────────────────────┐
       ▼                                         ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│ 2. Full-Screen Hero Stages    │ │ 3. Summary Architecture Grid  │
│    - Focus on a single step   │ │    - Parallel step cards      │
│    - Live interactive graphics│ │    - Consistent mini diagrams │
│    - Dynamic parameter morph  │ │    - Invariant / O(N) footer  │
└───────────────────────────────┘ └───────────────────────────────┘
```

---

## 2. Mathematical Rigor & Invariant Preservation

When animating mathematical or algorithmic processes, adhere strictly to these principles:

### A. Equal Baseline to Dynamic Redistribution
* Always start from an intuitive **Uniform Initial State** (e.g., equal $20\%$ visual shares across all bins).
* Show conservation laws explicitly: $\sum_{i=1}^M s_i = 100\%$ and fixed timeline canvas width $W$.
* Animate frequency-driven modulation **symmetrically**:
  - **Burst / High-frequency intervals** expand **UP** ($20\% \rightarrow 48\%$).
  - **Sparse intervals** compress **DOWN** ($20\% \rightarrow 11.2\%$), protected by a non-zero floor guarantee ($w_i \ge 1.0$).
  - **Moderate intervals** adjust proportionally based on measured event count $N_i$.

### B. Proportional Scaling Formula
Always match production codebase formulations:
$$w_i = 1 + \alpha \cdot \left(\frac{N_i}{N_{\max}}\right)^k \qquad s_i = \left(\frac{w_i}{\sum_{j=1}^M w_j}\right) \cdot 100\% \qquad x_k = W \cdot \left(\frac{\sum_{i=1}^k w_i}{W_{\text{total}}}\right)$$

---

## 3. Motion Design & 3-Beat Pacing

Structure every hero stage into a **3-beat visual rhythm**:

```text
0.00 ..................... 0.20 ......................... 0.75 ..................... 1.00
[ Beat 1: Baseline Hold ]   [ Beat 2: Continuous Morph ]   [ Beat 3: Metrics & Settle ]
• Establish initial state    • Silky smooth bezier morph    • Reveal delta pills / tags
• Fixed reference lines      • Simultaneous multi-element   • Stable hold for speaker
```

### Critical Remotion Animation Rules

1. **NO CSS Transitions**: Never use `transition: 'all ...'` or `transition: 'height ...'` in inline styles. Remotion renders discrete frames, and CSS transitions cause frame-level timing collisions and micro-stutters.
2. **Pure Mathematical Interpolation**: Always calculate values using Remotion's `interpolate()`:
   ```tsx
   import { Easing, interpolate } from 'remotion';

   const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

   // Use cubic-bezier for natural, zero-jerk acceleration and soft deceleration
   const morphProgress = interpolate(progress, [0.18, 0.76], [0, 1], {
     ...clamp,
     easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
   });
   ```
3. **Decouple Number Counters & Badges**:
   Animate physical geometric shapes first (`0.18..0.76`), then reveal numeric badges and deltas near the end (`0.68..0.88`) with a gentle upward glide: `transform: translateY(${(1 - badgeProgress) * 6}px)`.

---

## 4. Visual Aesthetics & Presentation Polish

* **Distraction-Free Layout**: Keep the interface clean. Avoid cluttered tags, chips, or redundant legends in hero stages.
* **Palette & Colors**:
  - Deep Charcoal / Dark Text: `#0f172a`
  - Muted Secondary: `#475569`
  - Accent Burst / Peak: `#C8102E` (TU/e Red)
  - Discretization / Grid: `#2563eb` (Royal Blue)
  - Allocation / Reallocation: `#8b5cf6` (Violet)
  - Integration / Warped Output: `#10b981` (Emerald)
* **Font System**:
  - Sans-serif for titles & descriptions (`Inter`, `Helvetica Neue`, system-ui).
  - Monospace for formulas, timestamps, and numbers (`SF Mono`, `Fira Code`, `JetBrains Mono`).
* **Subpixel Antialiasing**:
  Always add to root containers:
  ```css
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  ```

---

## 5. Export Settings for Maximum Sharpness

To produce **razor-sharp presentation videos** with zero compression artifacting on fine lines and typography:

### A. 4K UHD Master (Retina Super-Sampled)
```bash
npx remotion render <entry_point> <composition_id> <output_path.mp4> \
  --scale=2 \
  --crf=14 \
  --pixel-format=yuv420p
```

### B. High-Bitrate 1080p Web/Slide Master
```bash
npx remotion render <entry_point> <composition_id> <output_path.mp4> \
  --crf=14 \
  --pixel-format=yuv420p
```

### C. Presentation Still Keyframes
```bash
npx remotion still <entry_point> <composition_id> <output_path.png> \
  --frame=<frame_number> \
  --scale=2
```

### Settings Reference
* `--scale=2`: Renders at $3840 \times 2160$ (2x device pixel ratio). Renders SVG paths, thin borders, and monospace labels with 4x pixel density.
* `--crf=14`: Constant Rate Factor (visually lossless H.264 compression). Eliminates ringing artifacts around high-contrast lines.
* `--pixel-format=yuv420p`: Universal 4:2:0 chroma compatibility for Keynote, PowerPoint, QuickTime, Safari, and Chrome.
