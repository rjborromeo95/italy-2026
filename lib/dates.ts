export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Ordered list of every ISO date across the configured months. */
export function allDates(months: [number, number][]): string[] {
  const out: string[] = [];
  for (const [y, m] of months) {
    const dim = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= dim; d++) out.push(iso(y, m, d));
  }
  return out;
}

export type Run = { start: string; end: string };

/**
 * Find contiguous runs of calendar days at the maximum overlap count.
 * Returns the peak count and runs sorted longest-first, then earliest.
 */
export function bestWindows(
  counts: Record<string, number>,
  months: [number, number][],
): { max: number; runs: Run[] } {
  const dates = allDates(months);
  let max = 0;
  for (const s of dates) max = Math.max(max, counts[s] ?? 0);
  if (max === 0) return { max: 0, runs: [] };

  const runs: Run[] = [];
  let cur: Run | null = null;
  let prev: string | null = null;
  for (const s of dates) {
    const isPeak = (counts[s] ?? 0) === max;
    const consecutive = prev !== null && Date.parse(s) - Date.parse(prev) === 86400000;
    if (isPeak) {
      if (cur && consecutive) cur.end = s;
      else { cur = { start: s, end: s }; runs.push(cur); }
    } else {
      cur = null;
    }
    prev = s;
  }
  runs.sort((a, b) => {
    const la = span(a), lb = span(b);
    if (lb !== la) return lb - la;
    return Date.parse(a.start) - Date.parse(b.start);
  });
  return { max, runs };
}

export function span(r: Run): number {
  return (Date.parse(r.end) - Date.parse(r.start)) / 86400000 + 1;
}

/** All ISO dates covered by a run, inclusive. */
export function runDates(r: Run): string[] {
  const out: string[] = [];
  let t = Date.parse(r.start);
  const end = Date.parse(r.end);
  while (t <= end) {
    const d = new Date(t);
    out.push(iso(d.getFullYear(), d.getMonth(), d.getDate()));
    t += 86400000;
  }
  return out;
}

export function fmtDay(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });
}

export function fmtRange(r: Run): string {
  if (r.start === r.end) return fmtDay(r.start);
  const a = new Date(r.start + "T00:00:00");
  const b = new Date(r.end + "T00:00:00");
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const left = a.toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", ...(sameMonth ? {} : { month: "short" }),
  });
  const right = b.toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });
  return `${left} – ${right}`;
}

/** Warm "sun" glow for a fill ratio p in [0,1]. */
export function glowColor(p: number): string {
  if (p <= 0) return "#ffffff";
  const a = 0.22 + p * 0.78;
  const hue = 45 - p * 17;
  const light = 58 - p * 6;
  return `hsla(${hue}, 92%, ${light}%, ${a})`;
}

/** Group a person's dates into [{ label: "Jul 2026", days: [11,12,13] }]. */
export function groupDatesByMonth(dates: string[]): { label: string; days: number[] }[] {
  const by: Record<string, number[]> = {};
  for (const s of [...dates].sort()) {
    const d = new Date(s + "T00:00:00");
    const label = `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
    (by[label] ??= []).push(d.getDate());
  }
  return Object.entries(by).map(([label, days]) => ({ label, days }));
}
