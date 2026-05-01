import { Link } from "react-router-dom";
import { sampleFilings } from "@/data/fixtures";
import { Search, Filter } from "lucide-react";

const statusPill = (s: string) => {
  const map: Record<string, { fg: string; dot: string; label: string }> = {
    "needs-review": { fg: "text-amber", dot: "bg-amber", label: "Needs review" },
    validated: { fg: "text-forest", dot: "bg-forest", label: "Validated" },
    filed: { fg: "text-muted-foreground", dot: "bg-muted-foreground", label: "Filed" },
    draft: { fg: "text-ink-soft", dot: "bg-ink-soft/50", label: "Draft" },
  };
  const c = map[s] || map.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 ${c.fg} text-[11.5px] font-medium`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

export default function Filings() {
  return (
    <div className="max-w-[1280px] mx-auto px-8 py-10 animate-fade-in">
      <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <p className="label-mono mb-2">All filings</p>
          <h1 className="font-display text-[36px] text-ink leading-none">
            Matters under your care
          </h1>
          <p className="mt-3 text-[13px] text-muted-foreground max-w-xl">
            Every IDS, draft to filed. Sorted by deadline. Filter by attorney, client, or stage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 inline-flex items-center gap-2 border border-rule rounded-sm bg-card text-[12px] text-ink hover:border-ink/40">
            <Filter className="h-3.5 w-3.5" /> Filter
          </button>
          <div className="h-9 px-3 inline-flex items-center gap-2 border border-rule rounded-sm bg-card text-[12px] text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            <input placeholder="Search…" className="bg-transparent focus:outline-none w-44" />
          </div>
        </div>
      </div>

      <div className="paper-card bg-card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-rule bg-paper-warm/50 text-left">
              <th className="px-5 py-3 label-mono font-normal">Matter</th>
              <th className="px-3 py-3 label-mono font-normal">Application / Title</th>
              <th className="px-3 py-3 label-mono font-normal">Client</th>
              <th className="px-3 py-3 label-mono font-normal">Stage</th>
              <th className="px-3 py-3 label-mono font-normal text-right">Refs</th>
              <th className="px-3 py-3 label-mono font-normal">Due</th>
              <th className="px-5 py-3 label-mono font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {sampleFilings.map((f) => (
              <tr key={f.id} className="border-b border-rule-soft last:border-b-0 hover:bg-paper-warm/30 transition-colors">
                <td className="px-5 py-4">
                  <Link to={`/filings/${f.id}`} className="font-mono text-[12px] text-oxblood hover:underline underline-offset-4">
                    {f.matter}
                  </Link>
                </td>
                <td className="px-3 py-4">
                  <p className="font-mono text-[11.5px] text-muted-foreground">{f.applicationNumber}</p>
                  <Link to={`/filings/${f.id}`} className="text-ink hover:underline underline-offset-4">
                    {f.title}
                  </Link>
                </td>
                <td className="px-3 py-4 text-ink-soft">{f.client}</td>
                <td className="px-3 py-4 text-ink-soft text-[12.5px]">{f.stage}</td>
                <td className="px-3 py-4 text-right tabnum stat-num text-[16px] text-ink">{f.references.length}</td>
                <td className="px-3 py-4 font-mono text-[12px] tabnum text-ink-soft">{f.dueDate}</td>
                <td className="px-5 py-4">{statusPill(f.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
