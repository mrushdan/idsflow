import { FileText, BookMarked, Database, Settings as SettingsIcon } from "lucide-react";

export function StubPage({
  eyebrow,
  title,
  body,
  items,
  Icon,
}: {
  eyebrow: string;
  title: string;
  body: string;
  items: { name: string; meta: string }[];
  Icon: any;
}) {
  return (
    <div className="max-w-[1100px] mx-auto px-8 py-12 animate-fade-in">
      <p className="label-mono mb-3">{eyebrow}</p>
      <h1 className="font-display text-[40px] leading-tight text-ink max-w-2xl">{title}</h1>
      <p className="mt-4 text-[14px] text-muted-foreground max-w-xl leading-relaxed">{body}</p>

      <div className="mt-10 paper-card bg-card divide-y divide-rule-soft">
        {items.map((it) => (
          <div key={it.name} className="px-6 py-4 flex items-center gap-4 hover:bg-paper-warm/40">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] text-ink">{it.name}</p>
              <p className="text-[11.5px] text-muted-foreground font-mono">{it.meta}</p>
            </div>
            <button className="text-[12px] text-oxblood hover:text-oxblood-soft">Open →</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Templates() {
  return (
    <StubPage
      eyebrow="Templates"
      title="Boilerplate certifications, ready to attach."
      body="Edit firm-wide templates for § 1.97(e) statements, transmittal letters, and translation cover sheets. Changes propagate to every new IDS within seconds."
      Icon={BookMarked}
      items={[
        { name: "§ 1.97(e)(1) certification — foreign communication", meta: "v 4 · last edited by R. Lind · 12 days ago" },
        { name: "§ 1.97(e)(2) certification — newly known references", meta: "v 2 · last edited by M. Halloran · 1 month ago" },
        { name: "Transmittal letter — standard prosecution", meta: "v 7 · firm default" },
        { name: "Translation cover sheet — Japanese", meta: "v 3 · used in 142 filings" },
        { name: "Translation cover sheet — Chinese", meta: "v 2 · used in 38 filings" },
      ]}
    />
  );
}

export function Patricia() {
  return (
    <StubPage
      eyebrow="Patricia"
      title="Docketing sync, written back automatically."
      body="IDSFlow writes filed IDS records into Patricia matters in real time. Reconciliation runs every 15 minutes; conflicts surface here for resolution."
      Icon={Database}
      items={[
        { name: "Live connection · Patricia 9.4 EU instance", meta: "Last sync 2 min ago · 0 conflicts · 212 records reconciled today" },
        { name: "Auto-write IDS records on filing", meta: "Enabled · creates document type 'IDS-FILED' with full citation list" },
        { name: "Field mapping · matter ↔ application", meta: "12 fields mapped · last reviewed by IT 2 weeks ago" },
        { name: "Conflict resolution log", meta: "0 unresolved · 18 auto-merged this month" },
      ]}
    />
  );
}

export function Settings() {
  return (
    <StubPage
      eyebrow="Settings"
      title="Workspace preferences."
      body="Manage data sources, attorney signatures, OCR engines, and audit retention. Changes are logged."
      Icon={SettingsIcon}
      items={[
        { name: "EPO Espacenet OPS — primary source", meta: "Account WLP-prod · 32% daily quota · resets 00:00 UTC" },
        { name: "USPTO PAIR — fallback for US references", meta: "Active · 142 ms median latency" },
        { name: "OCR engine — Tesseract 5 + IPAex font pack", meta: "Last updated 4 days ago · supports JP, ZH, KR" },
        { name: "Attorney signatures on file", meta: "8 attorneys · M. Halloran, R. Lind, J. Ponack +5" },
        { name: "Audit log retention", meta: "7 years · ABA compliant · stored in Workspace vault" },
      ]}
    />
  );
}
