import type { OperationalNote } from "@workspace/api-client-react";
import type { DiaryStrings } from "@/i18n/diary";

export const NOTE_MAX = 4000;
export const NOTE_CATEGORIES = ["weather", "opening_closure", "technical", "event", "other"] as const;

/** Polling for other devices: refresh every 60s while visible, and on focus. */
export const NOTES_QUERY_OPTIONS = {
  refetchInterval: 60_000,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
  staleTime: 15_000,
} as const;

export function isRealDate(s: string | undefined | null): s is string {
  if (!s || s.startsWith("0000-") || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function addDays(s: string, n: number): string {
  const d = new Date(s + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function sortNotes(notes: readonly OperationalNote[]): OperationalNote[] {
  return [...notes].sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  );
}

export function formatNoteDate(iso: string, language: string): string {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString(language === "it" ? "it-IT" : "en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatNoteStamp(iso: string, language: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(language === "it" ? "it-IT" : "en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome",
  });
}

export function wasEdited(n: OperationalNote): boolean {
  return n.updatedAt !== n.createdAt;
}

export function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const NOTES_PDF_CSS = `
  .notes { margin-top: 22px; }
  .notes h2 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
  .notes .range { font-size: 11px; color: #4E82A0; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
  .note { background: #FFFFFF; border: 1px solid #C8E6F5; border-left: 3px solid #0070BA; border-radius: 6px; padding: 8px 10px; margin-bottom: 6px; page-break-inside: auto; break-inside: auto; }
  .note.general { border-left-color: #E6007E; }
  .note-head { font-size: 11px; font-weight: 600; color: #0C2340; margin-bottom: 3px; }
  .note-text { font-size: 12px; color: #0C2340; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }
  .note-meta { font-size: 10px; color: #4E82A0; margin-top: 4px; }
  .notes-empty { font-size: 12px; color: #4E82A0; }
`;

/** HTML block of notes for the PDF. Every user-provided value is escaped. */
export function buildNotesHtmlSection(
  title: string,
  rangeLabel: string,
  notes: readonly OperationalNote[],
  s: DiaryStrings,
  language: string,
): string {
  const items = sortNotes(notes).map((n) => {
    const scope = n.liftId == null ? s.general : n.liftName ?? `#${n.liftId}`;
    const meta = [s.createdBy(n.authorName, formatNoteStamp(n.createdAt, language))];
    if (wasEdited(n)) meta.push(s.editedBy(n.updatedByName, formatNoteStamp(n.updatedAt, language)));
    return `<div class="note${n.liftId == null ? " general" : ""}">
      <div class="note-head">${escapeHtml(formatNoteDate(n.date, language))} · ${escapeHtml(scope)} · ${escapeHtml(s.categories[n.category] ?? n.category)}</div>
      <div class="note-text">${escapeHtml(n.text)}</div>
      <div class="note-meta">${meta.map(escapeHtml).join(" · ")}</div>
    </div>`;
  }).join("");
  return `<section class="notes"><h2>${escapeHtml(title)}</h2><div class="range">${escapeHtml(rangeLabel)}</div>${items || `<div class="notes-empty">${escapeHtml(s.pdfNoNotes)}</div>`}</section>`;
}

export interface NotesInterval { from: string; to: string; notes: readonly OperationalNote[] }

/** Notes blocks for PDF: current interval and (optional) compared interval, kept separate with actual dates. */
export function buildPeriodNotesHtml(
  current: NotesInterval,
  compared: NotesInterval | null,
  s: DiaryStrings,
  language: string,
): string {
  const range = (i: NotesInterval) => `${formatNoteDate(i.from, language)} — ${formatNoteDate(i.to, language)} (${i.from} / ${i.to})`;
  return [
    buildNotesHtmlSection(`${s.periodNotes} · ${s.currentInterval}`, range(current), current.notes, s, language),
    compared ? buildNotesHtmlSection(`${s.periodNotes} · ${s.comparedInterval}`, range(compared), compared.notes, s, language) : "",
  ].join("");
}

/** Standalone single-period PDF document (no comparison). */
export function buildSinglePeriodHtml(args: {
  from: string; to: string; season: string; language: string; s: DiaryStrings;
  totals: { passages: number; guests: number; activeDays: number };
  lifts: ReadonlyArray<{ ggbz: string; totalPassages: number; totalGuests: number; activeDays: number }>;
  notes: readonly OperationalNote[];
}): string {
  const { from, to, season, language, s, totals, lifts, notes } = args;
  const it = language === "it";
  const fmt = (n: number) => n.toLocaleString(it ? "it-IT" : "en-GB");
  const rows = lifts.map((l, i) => `<tr><td>${i + 1}</td><td style="text-align:left">${escapeHtml(l.ggbz)}</td><td>${fmt(l.totalPassages)}</td><td>${fmt(l.totalGuests)}</td><td>${l.activeDays}</td></tr>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(it ? "Report periodo" : "Period report")}</title><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Segoe UI', sans-serif; background: #F1F8FC; color: #0C2340; padding: 24px; }
  h1 { font-size: 22px; margin-bottom: 4px; } .sub { font-size: 12px; color: #4E82A0; text-transform: uppercase; margin-bottom: 16px; }
  .cards { display: flex; gap: 12px; margin-bottom: 16px; } .card { flex: 1; background: #FFF; border: 1px solid #C8E6F5; border-radius: 10px; padding: 12px; }
  .lbl { font-size: 11px; color: #4E82A0; text-transform: uppercase; } .val { font-size: 20px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; background: #FFF; } td, th { padding: 6px 8px; font-size: 12px; text-align: right; border-bottom: 1px solid #C8E6F5; }
  ${NOTES_PDF_CSS}</style></head><body>
  <div class="sub">${escapeHtml(it ? "Report periodo" : "Period report")} · ${escapeHtml(season)}</div>
  <h1>${escapeHtml(formatNoteDate(from, language))} — ${escapeHtml(formatNoteDate(to, language))}</h1>
  <div class="cards"><div class="card"><div class="lbl">${it ? "Passaggi totali" : "Total passages"}</div><div class="val">${fmt(totals.passages)}</div></div>
  <div class="card"><div class="lbl">${it ? "Ospiti totali" : "Total guests"}</div><div class="val">${fmt(totals.guests)}</div></div>
  <div class="card"><div class="lbl">${it ? "Giorni attivi" : "Active days"}</div><div class="val">${totals.activeDays}</div></div></div>
  <table><thead><tr><th>#</th><th style="text-align:left">${it ? "Impianto" : "Lift"}</th><th>${it ? "Passaggi" : "Passages"}</th><th>${it ? "Ospiti" : "Guests"}</th><th>${it ? "Giorni" : "Days"}</th></tr></thead><tbody>${rows}</tbody></table>
  ${buildPeriodNotesHtml({ from, to, notes }, null, s, language)}
  </body></html>`;
}
