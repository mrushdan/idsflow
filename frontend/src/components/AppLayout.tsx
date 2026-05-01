import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Search, Command } from "lucide-react";

const routeTitles: Record<string, { eyebrow: string; title: string }> = {
  "/": { eyebrow: "Overview", title: "Today, in motion" },
  "/new": { eyebrow: "New IDS", title: "Begin a disclosure" },
  "/filings": { eyebrow: "Filings", title: "All matters" },
  "/templates": { eyebrow: "Templates", title: "Boilerplate & forms" },
  "/patricia": { eyebrow: "Patricia", title: "Docketing sync" },
  "/settings": { eyebrow: "Settings", title: "Workspace settings" },
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const meta =
    routeTitles[pathname] ||
    (pathname.startsWith("/filings/")
      ? { eyebrow: "Filing", title: "Filing detail" }
      : { eyebrow: "IDSFlow", title: "" });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-paper">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-rule px-5 bg-paper/80 backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="text-muted-foreground hover:text-ink h-7 w-7" />
              <div className="h-4 w-px bg-rule" />
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="label-mono">{meta.eyebrow}</span>
                {meta.title && (
                  <span className="font-display text-[15px] text-ink/70 italic truncate">
                    {meta.title}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="hidden md:flex items-center gap-2 h-8 px-2.5 border border-rule rounded-sm bg-card text-[12px] text-muted-foreground hover:border-ink/40 transition-colors">
                <Search className="h-3.5 w-3.5" />
                <span>Search matters, references, applicants…</span>
                <span className="ml-6 flex items-center gap-1 text-[10.5px] font-mono text-muted-foreground/70">
                  <Command className="h-2.5 w-2.5" />K
                </span>
              </button>
              <div className="h-7 px-2 flex items-center gap-1.5 border border-rule rounded-sm bg-card">
                <span className="h-1.5 w-1.5 rounded-full bg-forest" />
                <span className="label-mono text-[9.5px]">Espacenet · live</span>
              </div>
            </div>
          </header>

          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
