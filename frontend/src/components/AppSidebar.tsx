import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { FileText, Inbox, Plus, Settings, BookMarked, Activity, Database } from "lucide-react";

const primary = [
  { title: "Overview", url: "/", icon: Activity },
  { title: "New IDS", url: "/new", icon: Plus, accent: true },
  { title: "Filings", url: "/filings", icon: Inbox },
];

const secondary = [
  { title: "Templates", url: "/templates", icon: BookMarked },
  { title: "Patricia sync", url: "/patricia", icon: Database },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r border-rule">
      <SidebarHeader className="px-4 pt-5 pb-4 border-b border-rule-soft">
        <NavLink to="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-sm bg-ink text-paper grid place-items-center font-display text-[15px] leading-none pt-[2px]">
            <span className="italic">i</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-[17px] tracking-tight text-ink">IDSFlow</span>
              <span className="label-mono text-[9.5px] mt-[2px]">WLP · Internal</span>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="px-2 pt-4">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="label-mono px-2">Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {primary.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="h-9 data-[active=true]:bg-paper-deep data-[active=true]:text-ink data-[active=true]:font-medium"
                  >
                    <NavLink to={item.url} className="flex items-center gap-2.5">
                      <item.icon className={`h-[15px] w-[15px] ${item.accent ? "text-oxblood" : ""}`} />
                      {!collapsed && (
                        <span className={`text-[13.5px] ${item.accent ? "text-oxblood font-medium" : ""}`}>
                          {item.title}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          {!collapsed && <SidebarGroupLabel className="label-mono px-2">Library</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {secondary.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="h-9 data-[active=true]:bg-paper-deep data-[active=true]:text-ink data-[active=true]:font-medium"
                  >
                    <NavLink to={item.url} className="flex items-center gap-2.5">
                      <item.icon className="h-[15px] w-[15px]" />
                      {!collapsed && <span className="text-[13.5px]">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-rule-soft px-3 py-3">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-paper-deep border border-rule grid place-items-center font-display text-[12px] text-ink">
              EP
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[12.5px] text-ink font-medium">E. Park</span>
              <span className="text-[10.5px] text-muted-foreground">Senior Paralegal</span>
            </div>
          </div>
        ) : (
          <div className="h-7 w-7 mx-auto rounded-full bg-paper-deep border border-rule grid place-items-center font-display text-[12px]">
            EP
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
