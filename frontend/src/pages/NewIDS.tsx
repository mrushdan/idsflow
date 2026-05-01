import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  formatBytes,
  stageCertification,
  type ProsecutionStage,
} from "@/data/fixtures";
import {
  lookupReferences,
  extractReferencesFromFile,
  generateSb08Pdf,
  downloadBlob,
  splitPasteText,
  type FetchedReference,
} from "@/lib/api";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  FileCheck2,
  AlertTriangle,
  Sparkles,
  ArrowDown,
  Globe,
  Languages,
  Upload,
  FileText,
  X as XIcon,
  RefreshCw,
} from "lucide-react";

const STEPS = [
  { id: 1, key: "paste", label: "Paste references", note: "Patricia or free text" },
  { id: 2, key: "fetch", label: "Fetch & validate", note: "Espacenet · USPTO" },
  { id: 3, key: "review", label: "Review & certify", note: "Stage-aware" },
  { id: 4, key: "generate", label: "Generate SB/08", note: "Filing-ready PDF" },
];

// Real published patents — these will resolve against EPO OPS in live mode.
const SAMPLE_PASTE = `JP 2018-145672 A
US 2019/0231405 A1
CN 110234567 A
EP 3458211 B1
WO 2020/118432 A1
JP 2020-007512 A
KR 10-2019-0034521 A`;

type InputMode = "paste" | "upload";

export default function NewIDS() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [text, setText] = useState("");
  const [matter, setMatter] = useState("WLP-29387-US");
  const [appNo, setAppNo] = useState("17/845,221");
  const [stage, setStage] = useState<ProsecutionStage>("pre-FAOM");

  const [fetched, setFetched] = useState<FetchedReference[]>([]);
  const [fetching, setFetching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [generatedBlob, setGeneratedBlob] = useState<{ blob: Blob; filename: string } | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // File upload state
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<{ filename: string; note: string; count: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const lineCount = text.split("\n").filter((l) => l.trim()).length;
  const split = splitPasteText(text);

  // ---------------------------------------------------------------------
  // Step 1 → 2: file upload
  // ---------------------------------------------------------------------

  const handleFileSelect = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    setUploadInfo(null);
    try {
      const result = await extractReferencesFromFile(file);
      setText(result.references.join("\n"));
      setUploadInfo({
        filename: result.filename,
        note: result.note,
        count: result.references.length,
      });
      // Drop into paste mode so the user can edit before fetching
      setInputMode("paste");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ---------------------------------------------------------------------
  // Step 2: fetch with one-by-one rendering
  // ---------------------------------------------------------------------

  const beginFetch = async () => {
    if (split.patents.length === 0) return;
    setStep(2);
    setFetching(true);
    setProgress(0);
    setFetched([]);
    setFetchError(null);

    try {
      // Single backend call returns everything; we then render the rows one
      // at a time to preserve the progressive feel. Phase 5 will switch to
      // SSE so each row corresponds to a real server-side event.
      const results = await lookupReferences(split.patents);
      for (let i = 0; i < results.length; i++) {
        await new Promise((r) => setTimeout(r, 280));
        setFetched((prev) => [...prev, results[i]]);
        setProgress(Math.round(((i + 1) / results.length) * 100));
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setFetching(false);
    }
  };

  const retrySingle = async (rawInput: string) => {
    setRetrying(rawInput);
    try {
      const [refreshed] = await lookupReferences([rawInput]);
      if (refreshed) {
        setFetched((prev) =>
          prev.map((r) => (r.rawInput === rawInput ? refreshed : r))
        );
      }
    } catch (e) {
      console.error("Retry failed", e);
    } finally {
      setRetrying(null);
    }
  };

  // ---------------------------------------------------------------------
  // Step 4: real PDF generation
  // ---------------------------------------------------------------------

  const beginGenerate = async () => {
    setStep(4);
    setGenerating(true);
    setGenerated(false);
    setGenerateError(null);
    setGeneratedBlob(null);

    try {
      const result = await generateSb08Pdf({
        references: fetched,
        caseStage: stage,
        application: { app_number: appNo, matter },
        attorney: { name: "M. Halloran", reg_number: "48221" },
      });
      setGeneratedBlob(result);
      setGenerated(true);
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedBlob) downloadBlob(generatedBlob.blob, generatedBlob.filename);
  };

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------

  const successCount = fetched.filter((r) => !r.error).length;
  const errorCount = fetched.filter((r) => r.error).length;
  const translationCount = fetched.filter((r) => r.translationNote).length;

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-10 animate-fade-in">
      {/* Stepper */}
      <ol className="grid grid-cols-4 gap-px bg-rule border border-rule mb-10">
        {STEPS.map((s) => {
          const active = s.id === step;
          const done = s.id < step;
          return (
            <li
              key={s.id}
              className={`bg-card px-5 py-4 flex items-start gap-3 ${active ? "bg-paper-warm" : ""}`}
            >
              <div
                className={`mt-0.5 h-6 w-6 rounded-full grid place-items-center font-mono text-[11px] shrink-0 ${
                  done
                    ? "bg-forest text-paper"
                    : active
                    ? "bg-oxblood text-paper"
                    : "bg-paper-deep text-muted-foreground border border-rule"
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : s.id}
              </div>
              <div className="min-w-0">
                <p className={`text-[13px] font-medium ${active || done ? "text-ink" : "text-muted-foreground"}`}>
                  {s.label}
                </p>
                <p className="label-mono mt-0.5">{s.note}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* STEP 1 — Paste / Upload */}
      {step === 1 && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 paper-card bg-card">
            <div className="px-6 py-4 border-b border-rule">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-[22px] text-ink">Add references</h2>
                  <p className="text-[12.5px] text-muted-foreground mt-1">
                    Paste reference numbers, or upload a file we'll parse for you.
                  </p>
                </div>
                {inputMode === "paste" && (
                  <button
                    onClick={() => setText(SAMPLE_PASTE)}
                    className="text-[12px] text-oxblood hover:text-oxblood-soft underline-offset-4 hover:underline"
                  >
                    Paste sample (7 refs)
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="mt-3 flex gap-px bg-rule border border-rule w-fit text-[12px]">
                <button
                  onClick={() => setInputMode("paste")}
                  className={`px-3 h-7 ${inputMode === "paste" ? "bg-card text-ink" : "bg-paper-warm/40 text-muted-foreground hover:text-ink"}`}
                >
                  Paste
                </button>
                <button
                  onClick={() => setInputMode("upload")}
                  className={`px-3 h-7 ${inputMode === "upload" ? "bg-card text-ink" : "bg-paper-warm/40 text-muted-foreground hover:text-ink"}`}
                >
                  Upload file
                </button>
              </div>
            </div>

            {inputMode === "paste" ? (
              <>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`JP 2018-145672 A\nUS 2019/0231405 A1\nEP 3458211 B1\n…`}
                  className="w-full h-[420px] resize-none p-6 font-mono text-[13px] leading-[1.7] text-ink-soft bg-card focus:outline-none placeholder:text-muted-foreground/50"
                  spellCheck={false}
                />
                <div className="flex items-center justify-between border-t border-rule px-6 py-3 bg-paper-warm/40">
                  <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
                    <span>
                      <span className="tabnum text-ink font-medium">{split.patents.length}</span> patent ref{split.patents.length === 1 ? "" : "s"} queued
                    </span>
                    {split.npl.length > 0 && (
                      <>
                        <span className="h-3 w-px bg-rule" />
                        <span className="text-amber">
                          {split.npl.length} NPL ref{split.npl.length === 1 ? "" : "s"} deferred for manual entry
                        </span>
                      </>
                    )}
                    {lineCount === 0 && <span>Paste references or load a sample to start.</span>}
                  </div>
                  <button
                    disabled={split.patents.length === 0 || fetching}
                    onClick={beginFetch}
                    className="inline-flex items-center gap-2 h-9 px-4 bg-ink text-paper text-[12.5px] font-medium rounded-sm hover:bg-ink-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Fetch from Espacenet
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="p-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx,.xlsm,.csv,.tsv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                    e.target.value = ""; // allow re-selecting same file
                  }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-rule hover:border-ink/40 rounded-sm bg-paper-warm/30 hover:bg-paper-warm/60 transition-colors cursor-pointer p-12 flex flex-col items-center text-center"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-oxblood mb-4" />
                      <p className="text-[14px] text-ink">Parsing your file…</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-ink-soft mb-4" />
                      <p className="text-[14px] text-ink font-medium">Click to select a file</p>
                      <p className="text-[12px] text-muted-foreground mt-1.5">
                        PDF, Word, Excel, CSV, or text. We'll extract patent reference numbers.
                      </p>
                    </>
                  )}
                </div>

                {uploadError && (
                  <div className="mt-4 p-3 bg-paper-warm border border-oxblood/30 rounded-sm flex items-start gap-2 text-[12.5px]">
                    <AlertTriangle className="h-3.5 w-3.5 text-oxblood mt-0.5 shrink-0" />
                    <div>
                      <p className="text-ink font-medium">Upload failed</p>
                      <p className="text-muted-foreground mt-0.5">{uploadError}</p>
                    </div>
                  </div>
                )}

                {uploadInfo && (
                  <div className="mt-4 p-3 bg-paper-warm border border-forest/30 rounded-sm flex items-start gap-2 text-[12.5px]">
                    <FileText className="h-3.5 w-3.5 text-forest mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-ink font-medium truncate">{uploadInfo.filename}</p>
                      <p className="text-muted-foreground mt-0.5">{uploadInfo.note}</p>
                      {uploadInfo.count > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          References loaded into the textarea — switch to the Paste tab to review or edit.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="paper-card bg-card p-6 space-y-5 h-fit">
            <div>
              <p className="label-mono mb-2">Filing context</p>
              <h3 className="font-display text-[18px] text-ink">Bind to a matter</h3>
            </div>
            <label className="block">
              <span className="label-mono">Matter no.</span>
              <input
                value={matter}
                onChange={(e) => setMatter(e.target.value)}
                className="mt-1.5 w-full h-9 px-3 font-mono text-[13px] border border-rule bg-paper rounded-sm focus:outline-none focus:border-ink"
              />
            </label>
            <label className="block">
              <span className="label-mono">Application no.</span>
              <input
                value={appNo}
                onChange={(e) => setAppNo(e.target.value)}
                className="mt-1.5 w-full h-9 px-3 font-mono text-[13px] border border-rule bg-paper rounded-sm focus:outline-none focus:border-ink"
              />
            </label>
            <div>
              <span className="label-mono">Prosecution stage</span>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {(Object.keys(stageCertification) as ProsecutionStage[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStage(s)}
                    className={`h-9 px-2 text-[12px] border rounded-sm transition-colors ${
                      stage === s
                        ? "bg-ink text-paper border-ink"
                        : "border-rule hover:border-ink/40 text-ink"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="mt-2.5 text-[11.5px] text-muted-foreground leading-snug">
                <span className="font-mono text-[11px] text-ink">{stageCertification[stage].code}</span> —{" "}
                {stageCertification[stage].note}
              </p>
            </div>
          </aside>
        </section>
      )}

      {/* STEP 2 — Fetch */}
      {step === 2 && (
        <section className="paper-card bg-card">
          <div className="px-6 py-4 border-b border-rule flex items-center justify-between">
            <div>
              <h2 className="font-display text-[22px] text-ink">
                {fetching ? "Fetching bibliographic data…" : fetchError ? "Fetch failed" : "Fetch complete"}
              </h2>
              <p className="text-[12.5px] text-muted-foreground mt-1">
                EPO Espacenet OPS · with USPTO PAIR fallback for US references
              </p>
            </div>
            <div className="flex items-center gap-3">
              {fetching ? (
                <Loader2 className="h-4 w-4 animate-spin text-oxblood" />
              ) : fetchError ? (
                <AlertTriangle className="h-4 w-4 text-oxblood" />
              ) : (
                <FileCheck2 className="h-4 w-4 text-forest" />
              )}
              <span className="font-mono text-[12px] text-ink tabnum">{progress}%</span>
            </div>
          </div>

          <div className="h-px w-full bg-paper-deep relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-oxblood transition-all duration-300"
              style={{ width: `${progress}%`, height: "2px", top: "-0.5px" }}
            />
          </div>

          {fetchError && (
            <div className="px-6 py-4 bg-paper-warm border-b border-rule flex items-start gap-2 text-[12.5px]">
              <AlertTriangle className="h-3.5 w-3.5 text-oxblood mt-0.5 shrink-0" />
              <div>
                <p className="text-ink font-medium">Could not reach Espacenet</p>
                <p className="text-muted-foreground mt-0.5 font-mono text-[11px]">{fetchError}</p>
              </div>
            </div>
          )}

          <div className="divide-y divide-rule-soft">
            {fetched.map((r) => (
              <div
                key={r.id}
                className={`px-6 py-3 grid grid-cols-12 gap-3 items-center animate-fade-in ${
                  r.error ? "bg-oxblood/5" : ""
                }`}
              >
                <div className="col-span-1 flex items-center gap-1.5">
                  <Globe className={`h-3 w-3 ${r.error ? "text-oxblood" : "text-muted-foreground"}`} />
                  <span className="font-mono text-[11px] text-ink">{r.country}</span>
                </div>
                <div className="col-span-4">
                  <p className="font-mono text-[12px] text-ink">{r.number}</p>
                </div>
                <div className="col-span-5 min-w-0">
                  {r.error ? (
                    <>
                      <p className="text-[12.5px] text-oxblood font-medium">Lookup failed</p>
                      <p className="text-[11px] text-muted-foreground truncate font-mono">{r.error}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[12.5px] text-ink truncate">{r.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {r.applicants[0]} · {r.pubDate}
                      </p>
                    </>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  {r.error ? (
                    <button
                      disabled={retrying === r.rawInput}
                      onClick={() => retrySingle(r.rawInput)}
                      className="inline-flex items-center gap-1 text-[10.5px] text-oxblood hover:text-ink font-mono uppercase tracking-wider disabled:opacity-40"
                    >
                      {retrying === r.rawInput ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      retry
                    </button>
                  ) : (
                    <Check className="h-3.5 w-3.5 text-forest" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {!fetching && (
            <div className="border-t border-rule px-6 py-4 flex items-center justify-between bg-paper-warm/40">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 h-9 px-3 text-[12.5px] text-muted-foreground hover:text-ink"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
              <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground">
                <span>
                  <span className="tabnum text-ink font-medium">{successCount}</span> succeeded
                </span>
                {errorCount > 0 && (
                  <span className="text-oxblood">
                    <span className="tabnum font-medium">{errorCount}</span> failed
                  </span>
                )}
              </div>
              <button
                disabled={successCount === 0}
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 h-9 px-4 bg-ink text-paper text-[12.5px] font-medium rounded-sm hover:bg-ink-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Review references <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </section>
      )}

      {/* STEP 3 — Review */}
      {step === 3 && (
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 paper-card bg-card">
            <div className="px-6 py-4 border-b border-rule flex items-center justify-between">
              <div>
                <h2 className="font-display text-[22px] text-ink">Review &amp; certify</h2>
                <p className="text-[12.5px] text-muted-foreground mt-1">
                  {successCount} reference{successCount === 1 ? "" : "s"}
                  {translationCount > 0 && ` · ${translationCount} flagged for translation review`}
                  {errorCount > 0 && ` · ${errorCount} excluded due to lookup failure`}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                <Languages className="h-3.5 w-3.5" />
                Compliance check pending — runs at filing time
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-rule bg-paper-warm/50 text-left">
                    <th className="px-5 py-2.5 label-mono font-normal w-8"></th>
                    <th className="px-3 py-2.5 label-mono font-normal">Country</th>
                    <th className="px-3 py-2.5 label-mono font-normal">Number</th>
                    <th className="px-3 py-2.5 label-mono font-normal">Title / Applicant</th>
                    <th className="px-3 py-2.5 label-mono font-normal">Pub. date</th>
                    <th className="px-3 py-2.5 label-mono font-normal">Translation</th>
                  </tr>
                </thead>
                <tbody>
                  {fetched.filter((r) => !r.error).map((r, i) => (
                    <tr key={r.id} className="border-b border-rule-soft hover:bg-paper-warm/30">
                      <td className="px-5 py-3 font-mono text-[10.5px] text-muted-foreground tabnum">{String(i + 1).padStart(3, "0")}</td>
                      <td className="px-3 py-3 font-mono text-[11px] text-ink">{r.country}</td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-[11.5px] text-ink">{r.number}</span>
                        {r.englishFamilyMember && (
                          <span className="ml-2 inline-block px-1.5 py-px text-[9.5px] font-mono bg-highlight text-ink rounded-sm">
                            EN family
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 max-w-[320px]">
                        <p className="text-ink truncate">{r.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{r.applicants[0]}</p>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-ink-soft tabnum">{r.pubDate}</td>
                      <td className="px-3 py-3">
                        {r.translationNote ? (
                          <span className="inline-flex items-center gap-1 text-amber font-mono text-[10.5px] uppercase tracking-wider" title={r.translationNote}>
                            <Sparkles className="h-3 w-3" /> review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-forest font-mono text-[10.5px] uppercase tracking-wider">
                            <Check className="h-3 w-3" /> ok
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-rule px-6 py-4 flex items-center justify-between bg-paper-warm/40">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 h-9 px-3 text-[12.5px] text-muted-foreground hover:text-ink"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                onClick={beginGenerate}
                className="inline-flex items-center gap-2 h-10 px-5 bg-oxblood text-paper text-[13px] font-medium rounded-sm hover:bg-oxblood-soft transition-colors"
              >
                Generate SB/08 form <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Certification panel */}
          <aside className="paper-card bg-card p-6 space-y-5 h-fit">
            <div>
              <p className="label-mono mb-2">Certification</p>
              <h3 className="font-display text-[18px] text-ink leading-tight">
                {stageCertification[stage].label}
              </h3>
              <p className="font-mono text-[11px] text-oxblood mt-1.5">{stageCertification[stage].code}</p>
            </div>
            <div className="hairline" />
            <div className="space-y-3 text-[12px] text-ink-soft leading-relaxed">
              <p className="text-muted-foreground">{stageCertification[stage].note}</p>
              {stage === "post-FAOM" && (
                <p>
                  <span className="font-mono text-[11px] text-ink uppercase tracking-wider">Suggested:</span>{" "}
                  attach § 1.97(e)(1) statement — each item was first cited in a foreign communication ≤ 3 months ago.
                </p>
              )}
              {stage === "post-Notice" && (
                <div className="p-3 bg-paper-warm border border-rule-soft rounded-sm flex gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber mt-0.5 shrink-0" />
                  <p className="text-[11.5px]">
                    Fee under § 1.17(p) will be auto-included on filing.
                  </p>
                </div>
              )}
            </div>
            <div className="hairline" />
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="mt-0.5 h-3.5 w-3.5 accent-oxblood" />
              <span className="text-[12px] text-ink-soft leading-snug">
                Sign as <span className="font-medium text-ink">M. Halloran, Reg. No. 48,221</span>
              </span>
            </label>
          </aside>
        </section>
      )}

      {/* STEP 4 — Generate */}
      {step === 4 && (
        <section className="paper-card bg-card overflow-hidden">
          {generating && !generated ? (
            <div className="px-10 py-20 flex flex-col items-center text-center">
              <div className="relative h-16 w-16 mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-rule-soft" />
                <div className="absolute inset-0 rounded-full border-2 border-oxblood border-t-transparent animate-spin" />
              </div>
              <h2 className="font-display text-[26px] text-ink">Composing SB/08…</h2>
              <p className="text-[13px] text-muted-foreground mt-2 max-w-md">
                Building the Information Disclosure Statement, applying {stage} certifications,
                and assembling the reference packet.
              </p>
            </div>
          ) : generateError ? (
            <div className="px-10 py-20 flex flex-col items-center text-center">
              <AlertTriangle className="h-12 w-12 text-oxblood mb-4" />
              <h2 className="font-display text-[26px] text-ink">Generation failed</h2>
              <p className="text-[13px] text-muted-foreground mt-2 max-w-md font-mono">{generateError}</p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1.5 h-9 px-4 text-[12.5px] text-muted-foreground hover:text-ink"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Back to review
                </button>
                <button
                  onClick={beginGenerate}
                  className="inline-flex items-center gap-2 h-9 px-4 bg-oxblood text-paper text-[12.5px] font-medium rounded-sm hover:bg-oxblood-soft"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Try again
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Preview */}
              <div className="bg-paper-warm/60 p-10 border-r border-rule">
                <div className="bg-card border border-rule shadow-sm aspect-[8.5/11] p-8 mx-auto max-w-md text-[8px] leading-tight">
                  <div className="flex justify-between items-start border-b-2 border-ink pb-2 mb-3">
                    <div>
                      <p className="font-mono text-[7px]">PTO/SB/08a (01-10)</p>
                      <p className="font-mono text-[7px]">U.S. Patent and Trademark Office</p>
                    </div>
                    <p className="font-display text-[12px] text-ink">SB/08</p>
                  </div>
                  <p className="font-display text-[10px] text-center mb-3">
                    INFORMATION DISCLOSURE STATEMENT BY APPLICANT
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-3 text-[7px]">
                    <div><span className="text-muted-foreground">Application No.</span> {appNo}</div>
                    <div><span className="text-muted-foreground">Filing Date</span> {new Date().toISOString().slice(0,10)}</div>
                    <div><span className="text-muted-foreground">Matter</span> {matter}</div>
                    <div><span className="text-muted-foreground">Examiner</span> Reserved</div>
                  </div>
                  <table className="w-full text-[6.5px]">
                    <thead>
                      <tr className="border-y border-ink">
                        <th className="text-left py-1">Cite No.</th>
                        <th className="text-left">Document Number</th>
                        <th className="text-left">Pub. Date</th>
                        <th className="text-left">Patentee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fetched.filter((r) => !r.error).slice(0, 6).map((r, i) => (
                        <tr key={r.id} className="border-b border-rule">
                          <td className="py-1">{String(i + 1).padStart(3, "0")}</td>
                          <td className="font-mono">{r.number}</td>
                          <td className="font-mono">{r.pubDate}</td>
                          <td className="truncate max-w-[80px]">{r.applicants[0]}</td>
                        </tr>
                      ))}
                      {successCount > 6 && (
                        <tr><td colSpan={4} className="text-center py-1 italic text-muted-foreground">…{successCount - 6} more on continuation sheets</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-center label-mono mt-4">Page 1 · preview</p>
              </div>

              {/* Actions */}
              <div className="p-10 flex flex-col">
                <div className="inline-flex items-center gap-2 self-start mb-5 px-2.5 py-1 bg-paper-warm border border-forest/30 rounded-sm">
                  <Check className="h-3.5 w-3.5 text-forest" />
                  <span className="text-[11.5px] text-forest font-medium">PDF generated</span>
                </div>
                <h2 className="font-display text-[32px] leading-tight text-ink">
                  {generatedBlob?.filename || `SB08_${matter}.pdf`}
                </h2>
                <p className="text-[13px] text-muted-foreground mt-2">
                  {successCount} reference{successCount === 1 ? "" : "s"} · {generatedBlob ? formatBytes(generatedBlob.blob.size) : "—"}
                </p>

                <dl className="mt-8 space-y-3 text-[12.5px]">
                  {[
                    ["Matter", matter],
                    ["Application", appNo],
                    ["Stage", `${stage} · ${stageCertification[stage].code}`],
                    ["Signed by", "M. Halloran, Reg. No. 48,221"],
                    ["References", `${successCount} included${errorCount > 0 ? ` · ${errorCount} excluded` : ""}`],
                  ].map(([k, v]) => (
                    <div key={k} className="grid grid-cols-3 gap-3">
                      <dt className="label-mono col-span-1 pt-0.5">{k}</dt>
                      <dd className="col-span-2 text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-10 flex flex-col gap-2">
                  <button
                    onClick={handleDownload}
                    disabled={!generatedBlob}
                    className="inline-flex items-center justify-center gap-2 h-11 bg-oxblood text-paper text-[13.5px] font-medium rounded-sm hover:bg-oxblood-soft disabled:opacity-40 transition-colors"
                  >
                    <ArrowDown className="h-4 w-4" />
                    Download SB/08 PDF
                  </button>
                  <button
                    onClick={() => navigate("/filings")}
                    className="inline-flex items-center justify-center gap-2 h-11 bg-ink text-paper text-[13.5px] font-medium rounded-sm hover:bg-ink-soft transition-colors"
                    title="Patricia integration lands in Phase 4 — currently a no-op"
                  >
                    Write to Patricia &amp; file
                  </button>
                  <button
                    onClick={() => {
                      setStep(1);
                      setText("");
                      setFetched([]);
                      setGenerated(false);
                      setGeneratedBlob(null);
                      setProgress(0);
                      setUploadInfo(null);
                      setUploadError(null);
                    }}
                    className="h-9 text-[12px] text-muted-foreground hover:text-ink mt-2"
                  >
                    Start another IDS
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
