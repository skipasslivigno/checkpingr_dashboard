/** Group all thousands, including four-digit numbers in Italian. */
function groupDigits(digits: string, language: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, language === "it" ? "." : ",");
}

export function formatCount(value: number | null | undefined, language: string): string {
  return value == null || !Number.isFinite(value) ? "—" : groupDigits(String(Math.round(value)), language);
}

/** `value` is already in percentage points. */
export function formatPercent(value: number, language: string, signed = false): string {
  if (!Number.isFinite(value)) return "—";
  const [whole, fraction] = Math.abs(value).toFixed(1).split(".");
  const sign = value < 0 ? "−" : signed && value > 0 ? "+" : "";
  return `${sign}${groupDigits(whole, language)}${language === "it" ? "," : "."}${fraction}%`;
}
