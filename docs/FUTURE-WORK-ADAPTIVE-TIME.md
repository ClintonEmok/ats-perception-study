# Future Work: Adaptive Time Scaling & Burst Detection

Open algorithmic enhancements for the adaptive space-time cube timeline. None of these are implemented yet — this is a research/design backlog.

---

## 1. Multi-Resolution Burst Analysis (Wavelet Decomposition)

**Status:** Design only  
**Effort:** High  
**Impact:** High

### Problem
Current burst detection operates at a single fixed resolution. A "prolonged-peak" at weekly granularity is qualitatively different from a "prolonged-peak" at hourly granularity, but the taxonomy treats them identically.

### Proposed Approach
Decompose the crime time series into multiple sub-bands (e.g., hourly, 6-hourly, daily, weekly) using a discrete wavelet transform or equivalent multi-scale smoothing. Detect bursts independently at each scale. Each time point gets a **burst signature vector** `[B_hourly, B_6hourly, B_daily, B_weekly]` instead of a single scalar.

### Key Benefits
- Distinguishes short-term spikes from sustained regime changes
- Warp weights become scale-aware: a weekly peak warps differently than an hourly spike
- Enables "zoom into burst type" interactions (e.g., show only weekly-level bursts)

### Implementation Sketch
- Replace single-pass `computeAdaptiveMaps()` with a multi-pass loop over kernel widths
- Store per-scale burstiness maps alongside the existing combined map
- Extend `BurstBinResult` with a `scaleSignature: number[]` field
- Taxonomy classification runs per-scale, then merges via a priority rule (weekly peak > daily peak > hourly spike)

---

## 2. Change-Point-Guided Warp Boundaries

**Status:** Partially exists (`interval-detection.ts`)  
**Effort:** Medium  
**Impact:** High

### Problem
The warp map is currently a smooth continuous function. This means high-density regions bleed visual space into adjacent low-density regions, and meaningful boundaries (e.g., a sudden onset of crime activity) are not respected.

### Proposed Approach
Use detected change points as **hard warp boundaries** where the warp function is allowed discontinuities. Between consecutive change points, each segment gets its own warp weight proportional to its internal density. The warp map becomes a piecewise-linear CDF with breaks at change points.

### Key Benefits
- Warp respects semantic boundaries in the data
- Prevents "bleeding" of visual space across regime changes
- Produces more interpretable time segments

### Implementation Sketch
- Wire `detectChangePoints()` output into `computeAdaptiveMaps()` as boundary hints
- After computing per-bin warp weights, insert discontinuities at change-point indices
- Each segment's weights are renormalized independently
- Expose a `hardBoundaries: boolean` toggle in `AdaptiveControls`

---

## 3. Contextual Burst Baseline

**Status:** Not started  
**Effort:** Medium  
**Impact:** High

### Problem
Burst detection is currently absolute — a spike relative to the full dataset mean. But crime has strong expected patterns: Saturday nights are always busier than Tuesday mornings. Detecting "burstiness" without accounting for expected variation produces false positives.

### Proposed Approach
Build a **contextual baseline** from historical distributions:
- Compute expected hourly profile (mean + std per hour-of-day)
- Compute expected day-of-week profile
- Compute expected monthly/seasonal profile

A time period is "bursty" only if its activity exceeds what's expected for that context by a configurable number of standard deviations.

### Key Benefits
- Dramatically reduces false-positive burst detections
- Surfaces genuinely anomalous patterns (e.g., a Tuesday morning spike)
- Aligns with how crime analysts actually interpret data

### Implementation Sketch
- Add a `computeContextualBaseline(crimes)` function that produces `expectedRate(hourOfDay, dayOfWeek, month)` lookup
- Modify `classifyBurstWindow()` to accept a baseline and compute z-scores instead of raw thresholds
- Store baseline as a `Float32Array` in `useAdaptiveStore` alongside existing maps
- Baseline can be computed once per dataset load and cached

---

## 4. Kernel Density Estimation (KDE)

**Status:** Not started  
**Effort:** Low-Medium  
**Impact:** Medium

### Problem
Current density is raw bin counts normalized to [0,1]. This creates bin-edge artifacts: a crime that falls on one side of a bin boundary vs. the other changes the density estimate discontinuously.

### Proposed Approach
Replace binning with a Gaussian KDE with adaptive bandwidth (Silverman's rule or Sheather-Jones). This produces a smooth, continuous density function that eliminates edge effects.

### Key Benefits
- Smoother warp map with no bin-edge artifacts
- Bandwidth adapts to local data density automatically
- Drop-in replacement for the binning stage in the worker

### Implementation Sketch
- In `src/workers/adaptiveTime.worker.ts`, replace the bin-counting loop with a KDE evaluation
- Use Silverman's rule: `h = 1.06 * sigma * n^(-1/5)` for initial bandwidth
- Evaluate density at each of the 1024 output points by summing Gaussian kernels
- Bandwidth can be locally adaptive: `h_local = h * (median_distance / local_density)^0.5`

---

## 5. Information-Theoretic Warp Weights

**Status:** Not started  
**Effort:** Low  
**Impact:** Medium

### Problem
Current warp weight is `1 + blendedSignal * 5`, a linear scaling. This doesn't account for how much each bin diverges from a uniform distribution — bins with low but nonzero density still get significant visual space.

### Proposed Approach
Compute warp weights using **KL divergence from uniform** per bin. The divergence measures how much the observed distribution in each bin differs from what you'd expect under uniformity. This naturally handles long tails and gives disproportionate visual weight to genuinely unusual bins.

### Key Benefits
- More principled than linear scaling
- Naturally compresses bins that are close to expected
- Amplifies genuinely anomalous bins

### Implementation Sketch
- For each bin, compute `p = bin_count / total` and `q = 1 / bin_count`
- Weight = `KL(p || q) = p * log(p / q)` (clamped to avoid log(0))
- Normalize weights to sum to 1, then scale to the warp weight range [0.25, 4.0]
- Replace the `1 + blendedSignal * 5` formula in the worker

---

## 6. Animated Warp Transitions

**Status:** Not started  
**Effort:** Low  
**Impact:** Medium (UX)

### Problem
Dragging the warp factor slider causes the timeline to jump between states. There's no visual continuity between linear and warped views.

### Proposed Approach
Animate the D3 scale domain changes using `d3.interpolate` or CSS transitions. When `warpFactor` changes, interpolate between the current and target domain values over ~200ms.

### Key Benefits
- Makes warping feel fluid and intentional
- Helps users understand what's changing (the "breathing" effect)
- Low implementation cost

### Implementation Sketch
- In `useScaleTransforms.ts`, store the previous scale domain in a ref
- On warpFactor change, use `requestAnimationFrame` to lerp from old to new domain
- Apply easing (e.g., `d3.easeCubicInOut`) for natural motion
- Debounce to avoid jank during rapid slider movement

---

## 7. Burst Confidence Annotations

**Status:** Not started  
**Effort:** Low  
**Impact:** Low-Medium

### Problem
Burst classifications are presented as binary (is/isn't a burst) with metadata buried in tooltips. Users can't visually assess how confident the classification is.

### Proposed Approach
Map `burstConfidence` (0-100) to a visual channel on the burst regions in the timeline:
- **Opacity**: high confidence = solid, low confidence = ghostly
- **Stroke width**: high confidence = thick border, low confidence = thin/dashed
- **Color saturation**: high confidence = vivid, low confidence = muted

### Key Benefits
- Users can immediately gauge reliability of each burst detection
- Prevents over-trust in low-confidence classifications
- Minimal code change

### Implementation Sketch
- In `DualTimeline.tsx`, read `burstConfidence` from each burst slice
- Map to opacity: `opacity = 0.3 + (burstConfidence / 100) * 0.7`
- Apply via inline style or Tailwind class on the burst overlay `<rect>` elements

---

## 8. Seasonal Residual Warping

**Status:** Not started  
**Effort:** Medium-High  
**Impact:** Medium

### Problem
Predictable seasonal patterns (e.g., more crime in summer, weekly cycles) inflate the density signal and cause the warp to expand predictable periods rather than anomalous ones.

### Proposed Approach
Decompose the time series using STL (Seasonal-Trend decomposition using Loess) into:
- **Trend**: long-term direction
- **Seasonal**: repeating periodic pattern
- **Residual**: what's left after removing trend + seasonal

Warp based on the **residual** component only. This strips out predictable patterns and warps only on genuinely anomalous deviations.

### Key Benefits
- Warp targets anomalies, not expected variation
- Produces cleaner, more interpretable warped timelines
- Aligns with statistical best practices for time series analysis

### Implementation Sketch
- Implement or adapt a lightweight STL decomposition in `src/lib/`
- Run decomposition on the binned count series (not raw timestamps)
- Extract residual series and feed it into the warp weight computation
- Expose a `warpMode: 'density' | 'residual'` toggle in controls

---

## 9. Higher-Density / More Bursty Real Dataset

**Status:** Not started (data acquisition)  
**Effort:** Medium (acquisition + pipeline reconfiguration)  
**Impact:** High

### Problem

Empirical characterization of the current crime dataset (100k events, ~275 events/day over a city-wide area) revealed a binding constraint on the prototype: at 1d+ windows, *every* per-window summary statistic collapses to a near-constant distribution. Coefficient of variation across windows is 2–7% for rate, peak, and burstiness at daily or coarser scales. The 1h IEI burstiness has σ ≈ 0.12 (range [−0.6, 0.4]) and the 1h hotspot share has CV ≈ 42%, but absolute discriminative power is modest.

In short, the dataset is too sparse per unit area-time for per-window statistics to vary meaningfully. Adaptive scaling driven by these signals is, in practice, near-uniform — which is why the prototype can feel inert to users despite the algorithm being correct. This is *not* a failure of the method; it is a property of the data, and a result worth reporting. But the thesis would be stronger if the same prototype could be demonstrated on a dataset that actually exercises its design.

This finding was produced by `scripts/burstiness_sweep.py` and `scripts/spatial_concentration_sweep.py` (see "Pre-Integration Check" below for re-use).

### Proposed Approach

Acquire a real spatiotemporal dataset that satisfies at least one of:

- **Higher event density** — ≥ 5,000–10,000 events/day within a comparable area, so per-window statistics have more events to discriminate on
- **Genuinely bursty structure** — events that cluster in clear temporal bursts (aftershock sequences, social virality, financial market events) rather than the steady low-volume activity of a city-wide crime stream
- **Longer history at the same density** — 5+ years of data so multi-scale burst structure is visible

The current Chicago crime data satisfies none of these: density is low, structure is regular, and the working file is a 1-year sample. The Chicago "full" data (8.5M records) improves density 85× but is unlikely to dramatically change the per-window variance picture — it is still the same domain.

### Candidate Datasets

| Dataset | Density | Burstiness | Spatial? | Public? | Notes |
|---|---|---|---|---|---|
| NYC Taxi trips (TLC) | ~300k trips/day in Manhattan | Moderate (rush-hour spikes) | Pickup/dropoff lat-lon | Yes, monthly releases | Cleanest fit, well-documented |
| Bike share (NYC Citi Bike, London Santander) | ~50–100k trips/day | Strong (commute peaks) | Station lat-lon | Yes, public | Good density, clear patterns |
| USGS earthquakes (M2.5+, 2000–present) | ~30–150 events/day globally | Very high (aftershock sequences) | Lat-lon + depth | Yes, free | Canonical bursty dataset; literature precedent |
| NASA FIRMS wildfire hotspots | Highly variable | Extreme (fire seasons + diurnal) | Lat-lon | Yes, free | Genuinely bursty at multiple scales |
| OpenSky ADS-B flight tracks | ~50k flights/day | Moderate | Lat-lon + altitude | Yes, free for research | High-quality spatial data |
| Twitter / X geolocated posts | Highly variable | High (event-driven virality) | Lat-lon or geohash | Restricted | Useful but access-gated |
| LOBSTER limit order book data | Millions of events/day | Extreme | 1D (price level) | Restricted | Reference for burstiness literature |

**Recommendation:** USGS earthquakes and NASA FIRMS are the strongest candidates — both are public, well-documented, genuinely bursty at multiple scales, and have direct precedent in the burstiness-analysis literature (Ogata 1988 on earthquake declustering is essentially the same problem). NYC Taxi and bike share are stronger on density but weaker on burstiness. The choice depends on whether the thesis needs to demonstrate *temporal* burst handling (earthquakes, fires) or *spatiotemporal density* (taxi, bike share).

### Key Benefits

- Per-window statistics (B, hotspot share, peak) would have meaningfully higher variance, producing visible non-uniform time warping
- The burst taxonomy (§1) would have more dynamic range to work with
- Evaluation results (chapter 5) would not be limited by data sparsity — currently the "adaptive scaling produces minimal change" finding is partly an artifact of the data
- The discussion chapter can frame "data density bounds adaptive scaling's effectiveness" as an explicit, generalizable limitation, with a target dataset for replication

### Implementation Sketch

1. Pick one candidate and acquire raw data (CSV/Parquet)
2. Add a new ingestion path in `src/lib/queries/` matching the existing format detection pattern in `scripts/compute_burstiness.py` (`FORMATS` dict with `date` / `type` / `lat` / `lon` indices)
3. Re-run `scripts/burstiness_sweep.py` and `scripts/spatial_concentration_sweep.py` on the new dataset to confirm per-window variance is materially higher
4. Re-evaluate `src/workers/adaptiveTime.worker.ts` warp weight distribution — confirm the produced warp is visibly non-uniform at typical bin counts
5. Re-run user evaluation (`EVALUATION_PROTOCOL.md`) on the new dataset to confirm "adaptive scaling is useful" is a stronger result
6. Re-write §3 of `TEMPORAL_SCALING_CHARACTERIZATION.md` to compare density bounds across the two datasets

### Pre-Integration Check

Before committing to a candidate, run this against the new CSV and compare against the current `data/sources/Crimes_-_2001_to_Present_20260114.csv` baseline:

```bash
python scripts/burstiness_sweep.py NEW.csv --json /tmp/new_burst.json
python scripts/spatial_concentration_sweep.py NEW.csv --json /tmp/new_spatial.json
```

**Acceptance threshold:** the new dataset's per-window CV (coefficient of variation across windows) should be ≥ 2× the current values at the same (metric, window_size) cells. On the current data, the daily-scale CV is 2–7% across all metrics; the new dataset should push at least one daily-scale metric to ≥ 14%. If it does not, the candidate has the same sparsity problem and won't help.

For reference, the current baseline (`data/sources/Crimes_-_2001_to_Present_20260114.csv`) shows:

| Metric | 1h | 6h | 1d | 1w |
|---|---:|---:|---:|---:|
| Burstiness B (IEI)    | 0.30 | 0.06 | 0.01 | 0.00 |
| Burstiness B (bincount) | 0.15 | 0.03 | 0.02 | 0.01 |
| Hotspot share         | 0.42 | 0.21 | 0.14 | 0.06 |
| Spatial CV            | 0.86 | 0.14 | 0.07 | 0.02 |
| Event rate            | 0.29 | 0.12 | 0.06 | 0.02 |

(Coefficient of variation across windows per metric — the load-bearing fact for "does adaptive scaling have signal?")

---

## Priority Matrix

| # | Enhancement | Impact | Effort | Priority |
|---|-------------|--------|--------|----------|
| 2 | Change-point warp boundaries | High | Medium | **P0** — biggest qualitative improvement |
| 3 | Contextual burst baseline | High | Medium | **P0** — reduces false positives |
| 9 | New real dataset | High | Medium | **P0** — removes the binding data constraint |
| 4 | KDE density estimation | Medium | Low-Med | **P1** — drop-in quality improvement |
| 1 | Multi-resolution analysis | High | High | **P1** — deeper analysis, more work |
| 5 | Information-theoretic weights | Medium | Low | **P1** — easy win |
| 6 | Animated warp transitions | Medium | Low | **P2** — polish |
| 7 | Burst confidence annotations | Low-Med | Low | **P2** — polish |
| 8 | Seasonal residual warping | Medium | Med-High | **P2** — deeper stats, more complexity |

## Dependencies

```
#2 (change-point boundaries) depends on interval-detection.ts — already exists
#3 (contextual baseline) is independent
#4 (KDE) is independent
#1 (multi-resolution) benefits from #4 (KDE as base)
#5 (info-theoretic weights) is independent
#6, #7, #8 are all independent
#9 (new dataset) is independent of algorithmic changes but
   enables re-evaluation of every other enhancement on data
   that actually exercises them. The pre-integration check
   should be run before committing to acquisition.
```

## Related Code

| Current File | Relevant Enhancement |
|---|---|
| `src/workers/adaptiveTime.worker.ts` | #1, #4, #5, #8 |
| `src/lib/interval-detection.ts` | #2 |
| `src/lib/binning/burst-taxonomy.ts` | #1, #3 |
| `src/lib/burst-detection.ts` | #1, #3 |
| `src/store/useAdaptiveStore.ts` | #1, #3, #4 |
| `src/components/timeline/hooks/useScaleTransforms.ts` | #2, #6 |
| `src/components/timeline/DualTimeline.tsx` | #7 |
| `src/components/timeline/AdaptiveControls.tsx` | #2, #3, #4, #8 |
