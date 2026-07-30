'use client';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { DEFAULT_KDE_PARAMS, type KdeParams } from '@/lib/kde';

interface KdeTuningPanelProps {
  value: KdeParams;
  onChange: (next: KdeParams) => void;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function KdeTuningPanel({ value, onChange }: KdeTuningPanelProps) {
  const smoothingMeters = value.smoothingMeters ?? Math.round((value.sigmaCells * 10_000) / Math.max(4, value.gridSize));
  const isSelective = smoothingMeters <= 250 || value.threshold >= 0.18;

  return (
    <section className="rounded-2xl border border-sky-500/15 bg-slate-950/60 p-4 text-xs text-slate-300 shadow-[0_24px_80px_-48px_rgba(14,165,233,0.45)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-sky-300">
            KDE Tuning
          </div>
          <h3 className="mt-1 text-sm font-medium text-slate-50">
            Hotspot sharpness
          </h3>
        </div>

        <span className="rounded-full border border-sky-400/15 bg-sky-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-sky-200">
          {isSelective ? 'Selective' : 'Broad'}
        </span>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Grid size
            </Label>
            <span className="tabular-nums text-slate-100">{value.gridSize}</span>
          </div>
          <Slider
            min={16}
            max={128}
            step={8}
            value={[value.gridSize]}
            onValueChange={([next]) =>
              onChange({
                ...value,
                gridSize: next ?? DEFAULT_KDE_PARAMS.gridSize,
              })
            }
            className="[&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-range]]:bg-sky-400 [&_[data-slot=slider-thumb]]:size-3.5"
          />
          <p className="text-[10px] leading-4 text-slate-500">
            Higher values split the city into smaller cells.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Smoothing radius
            </Label>
            <span className="tabular-nums text-slate-100">{smoothingMeters}m</span>
          </div>
          <Slider
            min={75}
            max={1000}
            step={25}
            value={[smoothingMeters]}
            onValueChange={([next]) =>
              onChange({
                ...value,
                smoothingMeters: next ?? value.smoothingMeters ?? 250,
              })
            }
            className="[&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-range]]:bg-sky-400 [&_[data-slot=slider-thumb]]:size-3.5"
          />
          <p className="text-[10px] leading-4 text-slate-500">
            Smaller radii keep peaks tight. Larger radii merge nearby activity.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Kernel radius
            </Label>
            <span className="tabular-nums text-slate-100">{value.kernelRadiusCells}</span>
          </div>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[value.kernelRadiusCells]}
            onValueChange={([next]) =>
              onChange({
                ...value,
                kernelRadiusCells: next ?? DEFAULT_KDE_PARAMS.kernelRadiusCells,
              })
            }
            className="[&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-range]]:bg-sky-400 [&_[data-slot=slider-thumb]]:size-3.5"
          />
          <p className="text-[10px] leading-4 text-slate-500">
            Smaller radii ignore far neighbors and tighten the blur.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Cutoff
            </Label>
            <span className="tabular-nums text-slate-100">{formatPercent(value.threshold)}</span>
          </div>
          <Slider
            min={0.02}
            max={0.6}
            step={0.01}
            value={[value.threshold]}
            onValueChange={([next]) =>
              onChange({
                ...value,
                threshold: next ?? DEFAULT_KDE_PARAMS.threshold,
              })
            }
            className="[&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-range]]:bg-sky-400 [&_[data-slot=slider-thumb]]:size-3.5"
          />
          <p className="text-[10px] leading-4 text-slate-500">
            Higher cutoffs hide weaker cells so hotspots read more distinctly.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-[10px] leading-5 text-slate-400">
        {isSelective
          ? 'This setting favors tighter hotspots and less overlap between regions.'
          : 'This setting keeps more context but may merge nearby hotspots.'}
      </div>
    </section>
  );
}
