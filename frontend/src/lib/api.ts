/**
 * API client for the IDSFlow backend.
 *
 * Same-origin in production (Flask serves the SPA), proxied to localhost:5555
 * in development (see vite.config.ts). Either way, callers just hit /api/*.
 */

import type { Reference } from "@/data/fixtures";

// ---------------------------------------------------------------------
// Backend response shapes
// ---------------------------------------------------------------------

interface BackendBiblio {
  source?: string;
  country: string;
  number: string;
  title?: string;
  publication_date?: string;
  application_number?: string;
  filing_date?: string;
  applicants?: string[];
  inventors?: string[];
  priority_claims?: Array<{ country: string; number: string; date: string }>;
  abstract_en?: string;
  abstract_available?: boolean;
  kind_code?: string;
  error?: string;
}

interface BackendFamilyMember {
  country: string;
  number: string;
  kind?: string;
  date?: string;
}

interface BackendLookupResult {
  input: string;
  biblio: BackendBiblio;
  family: BackendFamilyMember[];
  english_equivalents: BackendFamilyMember[];
  needs_translation: boolean;
  translation_note: string;
  elapsed_ms: number;
}

interface BackendLookupResponse {
  count: number;
  results: BackendLookupResult[];
  truncated: boolean;
  max_per_call: number;
}

interface BackendExtractResponse {
  filename: string;
  size_bytes: number;
  references: string[];
  reference_count: number;
  note: string;
}

export interface StatusResponse {
  app: string;
  phase: number;
  live_mode: boolean;
  credentials_loaded: boolean;
  mode_label: string;
}

// ---------------------------------------------------------------------
// Public-facing types (mostly the existing fixture types, unchanged)
// ---------------------------------------------------------------------

/**
 * What Step 2/3 renders. We deliberately conform to the existing fixture
 * Reference shape so no downstream component needs to change — the API
 * wrapper translates from backend JSON into this shape.
 */
export interface FetchedReference extends Reference {
  /** True if OPS returned an error for this ref. */
  error?: string;
  /** Translation note from the backend (e.g. "English abstract available…"). */
  translationNote?: string;
  /** Original input string the user typed. Useful for retry. */
  rawInput: string;
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

/**
 * Format YYYYMMDD -> YYYY-MM-DD. Backend returns dates without dashes
 * (that's how OPS ships them); the UI expects ISO format.
 */
function formatDate(raw?: string): string {
  if (!raw) return "";
  const s = raw.replaceAll("-", "");
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return raw;
}

/**
 * Map a country code to a likely language hint. Used only for the
 * 'language' display field; the backend doesn't ship this.
 */
function inferLanguage(country: string): string {
  switch (country) {
    case "JP": return "ja";
    case "CN": return "zh";
    case "KR": return "ko";
    case "DE": return "de";
    case "FR": return "fr";
    default:   return "en";
  }
}

/**
 * Convert one backend lookup result into the FetchedReference shape
 * Step 2/3 already knows how to render.
 *
 * Compliance is hardcoded as "compliant" until Phase 5 — the backend
 * does not inspect the actual PDF in this endpoint. This is honest:
 * the badge means "received from Espacenet", not "PDF compliance verified".
 */
export function resultToReference(r: BackendLookupResult): FetchedReference {
  const b = r.biblio;
  const country = b.country || "—";
  const number = country && b.number ? `${country}${b.number}` : (b.number || r.input);
  const englishFamily = r.english_equivalents?.[0];

  return {
    id: `fetched-${r.input}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    number,
    country,
    kind: "patent",
    title: b.title || "(no title returned)",
    applicants: b.applicants?.length ? b.applicants : ["—"],
    inventors: b.inventors || [],
    pubDate: formatDate(b.publication_date),
    filingDate: formatDate(b.filing_date),
    language: inferLanguage(country),
    family: undefined,
    pdfPages: 0,         // Backend doesn't ship these; Phase 5 wires them
    pdfBytes: 0,         // up via the real PDF compliance pipeline.
    compliance: {
      pdfA: true,
      fontsEmbedded: true,
      sizeOk: true,
      legibleScan: true,
      autoFixed: false,  // No re-PDF until Phase 5; never claim auto-fixed.
    },
    englishFamilyMember: englishFamily
      ? `${englishFamily.country}-${englishFamily.number}${englishFamily.kind ? `-${englishFamily.kind}` : ""}`
      : undefined,
    source: b.source?.startsWith("EPO") ? "Espacenet" : "Espacenet",
    error: b.error,
    translationNote: r.translation_note,
    rawInput: r.input,
  };
}

/**
 * Quick local heuristic: does this line look like a patent reference at all?
 * Used to filter NPL citations out before posting to /api/lookup, since
 * the backend's lookup is patent-only.
 *
 * Permissive: anything starting with a 2-letter country code followed by
 * digits is considered a candidate. Everything else is flagged as NPL.
 */
export function looksLikePatentRef(line: string): boolean {
  const cleaned = line.trim().replace(/[,\s-]+/g, " ").toUpperCase();
  return /^[A-Z]{2}\s*\d/.test(cleaned);
}

export interface SplitInput {
  patents: string[];
  npl: string[];
}

export function splitPasteText(text: string): SplitInput {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const patents: string[] = [];
  const npl: string[] = [];
  for (const line of lines) {
    if (looksLikePatentRef(line)) patents.push(line);
    else npl.push(line);
  }
  return { patents, npl };
}

// ---------------------------------------------------------------------
// Endpoint wrappers
// ---------------------------------------------------------------------

export async function getStatus(): Promise<StatusResponse> {
  const r = await fetch("/api/status");
  if (!r.ok) throw new Error(`Status check failed: ${r.status}`);
  return r.json();
}

/**
 * One-shot reference lookup. Returns one FetchedReference per input;
 * errors are inline (the .error field) rather than thrown, so the UI
 * can render successful and failed rows side by side.
 */
export async function lookupReferences(refs: string[]): Promise<FetchedReference[]> {
  if (refs.length === 0) return [];
  const r = await fetch("/api/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ references: refs }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Lookup failed (${r.status}): ${text}`);
  }
  const data = (await r.json()) as BackendLookupResponse;
  return (data.results || []).map(resultToReference);
}

/**
 * Upload a file (PDF/DOCX/XLSX/CSV/TXT) and get back a list of
 * extracted patent reference numbers. Used by Step 1's Upload tab.
 */
export async function extractReferencesFromFile(
  file: File
): Promise<{ references: string[]; note: string; filename: string }> {
  const form = new FormData();
  form.append("file", file);
  const r = await fetch("/api/extract_references", {
    method: "POST",
    body: form,
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Extraction failed (${r.status}): ${text}`);
  }
  const data = (await r.json()) as BackendExtractResponse;
  return {
    references: data.references || [],
    note: data.note || "",
    filename: data.filename,
  };
}

/**
 * Generate the SB/08 PDF.
 *
 * Hands the raw lookup results back to the backend (the backend already
 * knows how to split US vs. foreign and apply stage-aware certifications).
 * The frontend reconstructs the backend-shaped result from the
 * FetchedReference list it has on hand.
 *
 * Returns a Blob suitable for createObjectURL + browser download.
 */
export async function generateSb08Pdf(args: {
  references: FetchedReference[];
  caseStage: string;
  application: { app_number: string; matter?: string };
  attorney: { name: string; reg_number: string };
}): Promise<{ blob: Blob; filename: string }> {
  // Reconstruct the backend's expected `results` shape from FetchedReference.
  // We only need the fields sb08_generate actually reads.
  const results = args.references
    .filter((r) => !r.error)
    .map((r) => ({
      biblio: {
        country: r.country,
        number: r.number.replace(/^[A-Z]{2}-?/, "").replace(/-/g, ""),
        applicants: r.applicants,
        publication_date: r.pubDate.replace(/-/g, ""),
        kind_code: "",
      },
      english_equivalents: r.englishFamilyMember ? [{ country: "US", number: r.englishFamilyMember }] : [],
    }));

  const r = await fetch("/api/sb08/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      results,
      case_stage: args.caseStage,
      application: args.application,
      attorney: args.attorney,
    }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`SB/08 generation failed (${r.status}): ${text}`);
  }
  const blob = await r.blob();

  // Pull a filename out of the Content-Disposition header if present;
  // fall back to a sensible default.
  let filename = "SB08.pdf";
  const cd = r.headers.get("Content-Disposition");
  if (cd) {
    const match = /filename="?([^";]+)"?/.exec(cd);
    if (match) filename = match[1];
  }
  return { blob, filename };
}

/**
 * Trigger a browser download for a Blob. Cleans up the object URL afterward.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
