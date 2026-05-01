import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  sampleReferences,
  formatBytes,
  stageCertification,
  type Reference,
  type ProsecutionStage,
} from "@/data/fixtures";
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
} from "lucide-react";

const STEPS = [
  { id: 1, key: "paste", label: "Paste references", note: "Patricia or free text" },
  { id: 2, key: "fetch", label: "Fetch & validate", note: "Espacenet · USPTO" },
  { id: 3, key: "review", label: "Review & certify", note: "Stage-aware" },
  { id: 4, key: "generate", label: "Generate SB/08", note: "Filing-ready PDF" },
];

const SAMPLE_PASTE = `JP 2018-145672 A
US 2019/0231405 A1
CN 110234567 A
EP 3 458 211 B1
WO 2020/118432 A1
JP 2020-007512 A
KR 10-2019-0034521 A
Smith et al., "Atomic-scale uniformity in cryogenic etch," J. Vac. Sci. Technol. A 38, 042602 (2020)`;

export default function NewIDS() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [text, setText] = useState("");
  const [matter, setMatter] = useState("WLP-29387-US");
  const [appNo, setAppNo] = useState("17/845,221");
  const [stage, setStage] = useState<ProsecutionStage>("pre-FAOM");
  const [fetched, setFetched] = useState<Reference[]>([]);
  const [fetching, setFetching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generated, setGenerated] = useState(false);

  const lineCount = text.split("\n").filter((l) => l.trim()).length;

  const beginFetch = async () => {
    setStep(2);
    setFetching(true);
    setProgress(0);
    setFetched([]);
    const refs = sampleReferences;
    for (let i = 0; i < refs.length; i++) {
      await new Promise((r) => setTimeout(r, 280));
      setFetched((prev) => [...prev, refs[i]]);
      setProgress(Math.round(((i + 1) / refs.length) * 100));
    }
    setFetching(false);
  };

  const beginGenerate = async () => {
    setStep(4);
    setGenerated(false);
    await new Promise((r) => setTimeout(r, 1400));
    setGenerated(true);
  };

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

      {/* STEP 1 — Paste */}
      {step === 1 && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 paper-card bg-card">
            <div className="px-6 py-4 border-b border-rule flex items-center justify-between">
              <div>
                <h2 className="font-display text-[22px] text-ink">Paste reference numbers</h2>
                <p className="text-[12.5px] text-muted-foreground mt-1">
                  One per line. Mix patents and NPL freely. We accept any common format.
                </p>
              </div>
              <button
                onClick={() => setText(SAMPLE_PASTE)}
                className="text-[12px] text-oxblood hover:text-oxblood-soft underline-offset-4 hover:underline"
              >
                Paste sample (8 refs)
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`JP 2018-145672 A\nUS 2019/0231405 A1\nEP 3 458 211 B1\n…`}
              className="w-full h-[420px] resize-none p-6 font-mono text-[13px] leading-[1.7] text-ink-soft bg-card focus:outline-none placeholder:text-muted-foreground/50"
              spellCheck={false}
            />
            <div className="flex items-center justify-between border-t border-rule px-6 py-3 bg-paper-warm/40">
              <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
                <span><span className="tabnum text-ink font-medium">{lineCount}</span> references detected</span>
                <span className="h-3 w-px bg-rule" />
                <span>Up to 500 per filing</span>
              </div>
              <button
                disabled={lineCount === 0}
                onClick={beginFetch}
                className="inline-flex items-center gap-2 h-9 px-4 bg-ink text-paper text-[12.5px] font-medium rounded-sm hover:bg-ink-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Fetch from Espacenet
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
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
                <span className="font-mono text-ink">{stageCertification[stage].code}</span> —{" "}
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
                {fetching ? "Fetching bibliographic data…" : "Fetch complete"}
              </h2>
              <p className="text-[12.5px] text-muted-foreground mt-1">
                EPO Espacenet OPS · with USPTO PAIR fallback for US references
              </p>
            </div>
            <div className="flex items-center gap-3">
              {fetching ? (
                <Loader2 className="h-4 w-4 animate-spin text-oxblood" />
              ) : (
                <FileCheck2 className="h-4 w-4 text-forest" />
              )}
              <span className="font-mono text-[12px] text-ink tabnum">{progress}%</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-px w-full bg-paper-deep relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-oxblood transition-all duration-300"
              style={{ width: `${progress}%`, height: "2px", top: "-0.5px" }}
            />
          </div>

          <div className="divide-y divide-rule-soft">
            {fetched.map((r) => (
              <div key={r.id} className="px-6 py-3 grid grid-cols-12 gap-3 items-center animate-fade-in">
                <div className="col-span-1 flex items-center gap-1.5">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-[11px] text-ink">{r.country}</span>
                </div>
                <div className="col-span-4">
                  <p className="font-mono text-[12px] text-ink">{r.number}</p>
                </div>
                <div className="col-span-5 min-w-0">
                  <p className="text-[12.5px] text-ink truncate">{r.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {r.applicants[0]} · {r.pubDate}
                  </p>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  {r.compliance.autoFixed && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-amber font-mono uppercase tracking-wider">
                      <Sparkles className="h-3 w-3" /> auto-fixed
                    </span>
                  )}
                  <Check className="h-3.5 w-3.5 text-forest" />
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
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 h-9 px-4 bg-ink text-paper text-[12.5px] font-medium rounded-sm hover:bg-ink-soft transition-colors"
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
                <h2 className="font-display text-[22px] text-ink">Review & certify</h2>
                <p className="text-[12.5px] text-muted-foreground mt-1">
                  {fetched.length} references · {fetched.filter((r) => r.compliance.autoFixed).length} auto-corrected · 0 require manual attention
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                <Languages className="h-3.5 w-3.5" />
                Non-English refs flagged for translation review
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
                    <th className="px-3 py-2.5 label-mono font-normal">PDF</th>
                    <th className="px-3 py-2.5 label-mono font-normal">Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {fetched.map((r, i) => (
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
                      <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground tabnum">
                        {r.pdfPages}p · {formatBytes(r.pdfBytes)}
                      </td>
                      <td className="px-3 py-3">
                        {r.compliance.autoFixed ? (
                          <span className="inline-flex items-center gap-1 text-amber font-mono text-[10.5px] uppercase tracking-wider">
                            <Sparkles className="h-3 w-3" /> auto-fixed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-forest font-mono text-[10.5px] uppercase tracking-wider">
                            <Check className="h-3 w-3" /> compliant
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
          {!generated ? (
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
                    <div><span className="text-muted-foreground">Filing Date</span> 2024-06-21</div>
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
                      {fetched.slice(0, 6).map((r, i) => (
                        <tr key={r.id} className="border-b border-rule">
                          <td className="py-1">{String(i + 1).padStart(3, "0")}</td>
                          <td className="font-mono">{r.number}</td>
                          <td className="font-mono">{r.pubDate}</td>
                          <td className="truncate max-w-[80px]">{r.applicants[0]}</td>
                        </tr>
                      ))}
                      <tr><td colSpan={4} className="text-center py-1 italic text-muted-foreground">…{fetched.length - 6} more on continuation sheets</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-center label-mono mt-4">Page 1 of 4 · preview</p>
              </div>

              {/* Actions */}
              <div className="p-10 flex flex-col">
                <div className="inline-flex items-center gap-2 self-start mb-5 px-2.5 py-1 bg-paper-warm border border-forest/30 rounded-sm">
                  <Check className="h-3.5 w-3.5 text-forest" />
                  <span className="text-[11.5px] text-forest font-medium">Ready to file</span>
                </div>
                <h2 className="font-display text-[32px] leading-tight text-ink">
                  IDS-{matter}-001.pdf
                </h2>
                <p className="text-[13px] text-muted-foreground mt-2">
                  4 pages · {fetched.length} references · PDF/A-2b · 187 KB
                </p>

                <dl className="mt-8 space-y-3 text-[12.5px]">
                  {[
                    ["Matter", matter],
                    ["Application", appNo],
                    ["Stage", `${stage} · ${stageCertification[stage].code}`],
                    ["Signed by", "M. Halloran, Reg. No. 48,221"],
                    ["Reference packet", `${fetched.length} PDFs · 36.2 MB · individually compliant`],
                  ].map(([k, v]) => (
                    <div key={k} className="grid grid-cols-3 gap-3">
                      <dt className="label-mono col-span-1 pt-0.5">{k}</dt>
                      <dd className="col-span-2 text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-10 flex flex-col gap-2">
                  <button className="inline-flex items-center justify-center gap-2 h-11 bg-oxblood text-paper text-[13.5px] font-medium rounded-sm hover:bg-oxblood-soft transition-colors">
                    <ArrowDown className="h-4 w-4" />
                    Download SB/08 + reference packet
                  </button>
                  <button
                    onClick={() => navigate("/filings")}
                    className="inline-flex items-center justify-center gap-2 h-11 bg-ink text-paper text-[13.5px] font-medium rounded-sm hover:bg-ink-soft transition-colors"
                  >
                    Write to Patricia & file
                  </button>
                  <button
                    onClick={() => {
                      setStep(1); setText(""); setFetched([]); setGenerated(false); setProgress(0);
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
