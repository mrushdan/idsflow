import { Link } from "react-router-dom";
import { sampleFilings } from "@/data/fixtures";
import { ArrowUpRight, Plus, AlertCircle, CheckCircle2, Clock } from "lucide-react";

const stat = (label: string, value: string | number, sub?: string) => (
  <div className="px-6 py-5 border-r border-rule last:border-r-0 flex flex-col gap-1">
    <span className="label-mono">{label}</span>
    <span className="stat-num text-[34px] text-ink leading-none mt-1">{value}</span>
    {sub && <span className="text-[12px] text-muted-foreground mt-1">{sub}</span>}
  </div>
);

const statusPill = (s: string) => {
  const map: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
    "needs-review": { bg: "bg-paper-warm", fg: "text-amber", dot: "bg-amber", label: "Needs review" },
    validated: { bg: "bg-paper-warm", fg: "text-forest", dot: "bg-forest", label: "Validated" },
    filed: { bg: "bg-paper-warm", fg: "text-muted-foreground", dot: "bg-muted-foreground", label: "Filed" },
    draft: { bg: "bg-paper-warm", fg: "text-ink-soft", dot: "bg-ink-soft/50", label: "Draft" },
  };
  const c = map[s] || map.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 ${c.bg} ${c.fg} text-[11px] font-medium rounded-sm border border-rule-soft`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

export default function Overview() {
  const open = sampleFilings.filter((f) => f.status !== "filed");
  const dueThisWeek = open.length;
  const totalRefs = sampleFilings.reduce((n, f) => n + f.references.length, 0);

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-10 animate-fade-in">
      {/* Hero */}
      <section className="mb-10">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-8">
          <div>
            <p className="label-mono mb-3">Thursday · 30 April 2026</p>
            <h1 className="font-display text-[44px] leading-[1.05] text-ink tracking-tight max-w-2xl">
              Good morning, Erin.<br />
              <span className="italic text-ink/70">Three filings, one quiet morning.</span>
            </h1>
            <p className="mt-4 text-[14px] text-muted-foreground max-w-xl leading-relaxed">
              IDSFlow has fetched bibliographic data for{" "}
              <span className="text-ink font-medium tabnum">{totalRefs} references</span> overnight.
              Two were auto-corrected for USPTO compliance. Nothing requires your attention before 10:00.
            </p>
          </div>
          <Link
            to="/new"
            className="group inline-flex items-center gap-2 h-11 px-5 bg-oxblood hover:bg-oxblood-soft text-paper text-[13.5px] font-medium rounded-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Begin new IDS
            <ArrowUpRight className="h-3.5 w-3.5 -mr-1 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>

        {/* Stats strip */}
        <div className="paper-card grid grid-cols-2 md:grid-cols-4 bg-card">
          {stat("Open filings", open.length, `${dueThisWeek} due this week`)}
          {stat("References, total", totalRefs, "across all open matters")}
          {stat("Auto-corrected", "2", "fonts re-embedded")}
          {stat("Avg. fetch time", "1.4 s", "Espacenet OPS · 99.8% uptime")}
        </div>
      </section>

      {/* Two-column: Active queue + System notes */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 paper-card bg-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
            <div className="flex items-baseline gap-3">
              <h2 className="font-display text-[20px] text-ink">Active queue</h2>
              <span className="label-mono">{open.length} open</span>
            </div>
            <Link to="/filings" className="text-[12px] text-muted-foreground hover:text-ink underline-offset-4 hover:underline">
              View all filings →
            </Link>
          </div>
          <ul>
            {open.map((f, i) => (
              <li key={f.id} className={`px-6 py-4 ${i !== open.length - 1 ? "border-b border-rule-soft" : ""} hover:bg-paper-warm/40 transition-colors`}>
                <Link to={`/filings/${f.id}`} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-7 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[11px] text-oxblood">{f.matter}</span>
                      <span className="text-rule">·</span>
                      <span className="font-mono text-[11px] text-muted-foreground">App. {f.applicationNumber}</span>
                    </div>
                    <p className="text-[14px] text-ink truncate">{f.title}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{f.client} · {f.attorney}</p>
                  </div>
                  <div className="col-span-2 text-[12px]">
                    <p className="label-mono mb-0.5">Stage</p>
                    <p className="text-ink">{f.stage}</p>
                  </div>
                  <div className="col-span-1 text-[12px] tabnum">
                    <p className="label-mono mb-0.5">Refs</p>
                    <p className="text-ink stat-num text-[18px] leading-none">{f.references.length}</p>
                  </div>
                  <div className="col-span-2 flex justify-end">{statusPill(f.status)}</div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="paper-card bg-card">
          <div className="px-6 py-4 border-b border-rule">
            <h2 className="font-display text-[20px] text-ink">Notes from the system</h2>
            <p className="label-mono mt-1">Last 24 hours</p>
          </div>
          <ul className="p-2">
            {[
              { icon: CheckCircle2, color: "text-forest", title: "WLP-30112 validated", body: "All 4 references PDF/A compliant. Ready for SB/08.", t: "2h ago" },
              { icon: AlertCircle, color: "text-amber", title: "Font auto-embedded", body: "JP-2020-007512-A had unembedded MS Mincho. Substituted with IPAex.", t: "6h ago" },
              { icon: Clock, color: "text-muted-foreground", title: "Espacenet OPS quota", body: "32% of daily quota used. Reset at 00:00 UTC.", t: "9h ago" },
              { icon: CheckCircle2, color: "text-forest", title: "Patricia sync complete", body: "212 docket entries reconciled.", t: "yesterday" },
            ].map((n, i) => (
              <li key={i} className="px-4 py-3 flex gap-3 hover:bg-paper-warm/40 rounded-sm">
                <n.icon className={`h-4 w-4 mt-0.5 shrink-0 ${n.color}`} />
                <div className="min-w-0">
                  <p className="text-[13px] text-ink font-medium">{n.title}</p>
                  <p className="text-[12px] text-muted-foreground leading-snug mt-0.5">{n.body}</p>
                  <p className="label-mono mt-1.5">{n.t}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer signature */}
      <div className="mt-16 pt-6 border-t border-rule-soft flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="font-mono">IDSFlow v1.4.2 · build 2026.04.30</span>
        <span className="font-display italic">from Espacenet to Patricia</span>
      </div>
    </div>
  );
}
