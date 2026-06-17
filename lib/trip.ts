// Edit this to set up your own trip. No code changes needed elsewhere.
export const TRIP = {
  /** Shown in the header, e.g. "Italia". */
  name: "Italia",
  /** Small line under the title, e.g. "summer 2026". */
  subtitle: "summer 2026",
  /** Headline question on the page. */
  headline: "Find the week you can all actually go.",
  /**
   * Months to display, as [year, monthIndex] where January = 0.
   * Default: June–September 2026.
   */
  months: [
    [2026, 5],
    [2026, 6],
    [2026, 7],
    [2026, 8],
  ] as [number, number][],
};
