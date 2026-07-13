import type { ReactNode } from 'react';

type SketchShellProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

type SketchPanelProps = {
  title?: string;
  subtitle?: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
};

type SketchChipProps = {
  children: ReactNode;
};

export function SketchShell({ eyebrow, title, subtitle, children }: SketchShellProps) {
  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="flex min-h-screen w-full flex-col overflow-hidden p-0">
        <section className="min-h-0 flex-1 p-4 sm:p-6">
          {eyebrow || title || subtitle ? (
            <header className="mb-6 rounded-lg border border-neutral-300 bg-white px-4 py-4 shadow-[0_1px_0_rgba(0,0,0,0.02)] sm:px-5">
              {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{eyebrow}</p> : null}
              {title ? <h1 className="mt-1 text-lg font-semibold text-neutral-900">{title}</h1> : null}
              {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">{subtitle}</p> : null}
            </header>
          ) : null}
          {children}
        </section>
      </div>
    </main>
  );
}

export function SketchPanel({ title, subtitle, className = '', contentClassName = 'p-4 sm:p-5', children }: SketchPanelProps) {
  return (
    <section className={`rounded-lg border border-neutral-300 bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)] ${className}`}>
      {title || subtitle ? (
        <div className="border-b border-neutral-200 px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              {title ? <h2 className="text-sm font-semibold text-neutral-900">{title}</h2> : null}
              {subtitle ? <p className="mt-0.5 text-[11px] leading-5 text-neutral-500">{subtitle}</p> : null}
            </div>
            <div className="h-2.5 w-2.5 rounded-full bg-neutral-300" aria-hidden="true" />
          </div>
        </div>
      ) : null}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

export function SketchChip({ children }: SketchChipProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-300 bg-neutral-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500">
      {children}
    </span>
  );
}

export function SketchLine({ className = '' }: { className?: string }) {
  return <div className={`h-2 rounded-full bg-neutral-200 ${className}`} aria-hidden="true" />;
}

export function SketchGrid({ rows = 4, cols = 6, className = '' }: { rows?: number; cols?: number; className?: string }) {
  const cells = Array.from({ length: rows * cols });
  return (
    <div className={`grid gap-2 ${className}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {cells.map((_, index) => (
        <div key={index} className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-2">
          <div className="h-3 rounded-full bg-neutral-200" />
          <div className="mt-2 h-2 w-3/4 rounded-full bg-neutral-200/80" />
        </div>
      ))}
    </div>
  );
}
