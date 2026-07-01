import type { Exp2WindowData } from "@/lib/ats-study/exp2-data";

export function exp2WindowSlug(window: Pick<Exp2WindowData, "windowDays" | "rank">): string {
  return `${window.windowDays}d-${window.rank}`;
}

export function parseExp2WindowSlug(slug: string): { windowDays: number; rank: number } | null {
  const match = slug.match(/^(\d+)d-(\d+)$/);
  if (!match) return null;
  const windowDays = Number(match[1]);
  const rank = Number(match[2]);
  if (!Number.isFinite(windowDays) || !Number.isFinite(rank)) return null;
  return { windowDays, rank };
}
