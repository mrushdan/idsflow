import { useParams, Link } from "react-router-dom";
import { sampleFilings, formatBytes, stageCertification } from "@/data/fixtures";
import { ArrowLeft, Download, FileText, Sparkles, Check, Clock, Globe } from "lucide-react";

export default function FilingDetail() {
  const { id } = useParams();
  const filing = sampleFilings.find((f) => f.id === id) || sampleFilings[0];
  const cert = stageCertification[filing.stage];

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-10 animate-fade-in">
      <Link to="/filings" className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-ink mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> All filings
      </Link>

      <header className="grid grid-cols-12 gap-8 mb-10 pb-10 border-b border-rule">
        <div className="col-span-12 lg:col-span-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-[11.5px] text-oxblood">{filing.matter}</span>
            <span className="text-rule">·</span>
            <span className="font-mono text-[11.5px] text-muted-foreground">App. {filing.applicationNumber}</span>
          </div>
          <h1 className="font-display text-[34px] leading-[1.1] text-ink">{filing.title}</h1>
          <p className="mt-4 text-[13.5px] text-muted-foreground">
            {filing.client} · Inventor {filing.inventor} · Attorney {filing.attorney}
          </p>
        </div>
        <aside className="col-span-12 lg:col-span-4 flex lg:justify-end items-start gap-2">
          <button className="h-10 px-4 inline-flex items-center gap-2 border border-rule rounded-sm bg-card text-[12.5px] text-ink hover:border-ink/40">
            <Download className="h-3.5 w-3.5" /> Download SB/08
          </button>
          <button className="h-10 px-4 inline-flex items-center gap-2 bg-oxblood text-paper text-[12.5px] font-medium rounded-sm hover:bg-oxblood-soft">
            <FileText className="h-3.5 w-3.5" /> Open in Patricia
          </button>
        </aside>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Reference list */}
        <section className="col-span-12 lg:col-span-8">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-[22px] text-ink">References <span className="text-muted-foreground tabnum text-[15px] font-sans">({filing.references.length})</span></h2>
            <span className="label-mono">All compliant · {filing.references.filter(r => r.compliance.autoFixed).length} auto-fixed</span>
          </div>
          <div className="paper-card bg-card divide-y divide-rule-soft">
            {filing.references.map((r, i) => (
              <article key={r.id} className="px-5 py-4 grid grid-cols-12 gap-3 hover:bg-paper-warm/30">
                <div className="col-span-1 font-mono text-[10.5px] text-muted-foreground tabnum pt-0.5">{String(i + 1).padStart(3, "0")}</div>
                <div className="col-span-2 flex items-center gap-1.5">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-[11.5px] text-ink">{r.country}</span>
                  {r.englishFamilyMember && (
                    <span className="px-1.5 py-px text-[9.5px] font-mono bg-highlight text-ink rounded-sm">EN</span>
                  )}
                </div>
                <div className="col-span-6 min-w-0">
                  <p className="font-mono text-[11.5px] text-ink">{r.number}</p>
                  <p className="text-[12.5px] text-ink-soft truncate mt-0.5">{r.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{r.applicants[0]} · {r.pubDate}</p>
                </div>
                <div className="col-span-3 flex items-center justify-end gap-3 text-[10.5px] font-mono uppercase tracking-wider">
                  <span className="text-muted-foreground tabnum">{r.pdfPages}p · {formatBytes(r.pdfBytes)}</span>
                  {r.compliance.autoFixed ? (
                    <span className="inline-flex items-center gap-1 text-amber">
                      <Sparkles className="h-3 w-3" /> fixed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-forest">
                      <Check className="h-3 w-3" /> ok
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Sidebar — certification + activity */}
        <aside className="col-span-12 lg:col-span-4 space-y-6">
          <div className="paper-card bg-card p-6">
            <p className="label-mono mb-2">Certification</p>
            <h3 className="font-display text-[18px] text-ink leading-tight">{cert.label}</h3>
            <p className="font-mono text-[11px] text-oxblood mt-1.5">{cert.code}</p>
            <p className="mt-3 text-[12px] text-muted-foreground leading-relaxed">{cert.note}</p>
          </div>

          <div className="paper-card bg-card p-6">
            <p className="label-mono mb-3">Compliance summary</p>
            <ul className="space-y-2.5 text-[12.5px]">
              {[
                ["PDF/A-2b conformance", "8 / 8"],
                ["Fonts embedded", "8 / 8"],
                ["File size ≤ 25 MB", "8 / 8"],
                ["OCR legibility", "8 / 8"],
              ].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between">
                  <span className="text-ink-soft">{k}</span>
                  <span className="font-mono text-forest tabnum">{v}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="paper-card bg-card p-6">
            <p className="label-mono mb-3">Activity</p>
            <ol className="relative border-l border-rule-soft ml-2 space-y-4">
              {[
                { t: "10:42", body: "Espacenet fetch complete · 8 refs", icon: Check, color: "text-forest" },
                { t: "10:43", body: "Auto-embedded MS Mincho → IPAex", icon: Sparkles, color: "text-amber" },
                { t: "10:44", body: "PDF/A validation passed", icon: Check, color: "text-forest" },
                { t: "10:46", body: "SB/08 generated", icon: FileText, color: "text-ink-soft" },
                { t: "—", body: "Awaiting attorney signature", icon: Clock, color: "text-muted-foreground" },
              ].map((e, i) => (
                <li key={i} className="pl-4 relative">
                  <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-paper border border-ink/40" />
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <e.icon className={`h-3 w-3 ${e.color}`} />
                    <span className="label-mono">{e.t}</span>
                  </div>
                  <p className="text-[12.5px] text-ink-soft">{e.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
