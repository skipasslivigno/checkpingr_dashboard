/** Business rule: 16:30/18:00 are partial imports; only the 23:30 batch is final. */
export function isFinalExtraction(extraction: string): boolean {
  return /^\d{14}$/.test(extraction) && extraction.slice(8, 12) === "2330";
}
