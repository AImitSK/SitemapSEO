"use client";

import { GlobeIcon, ListIcon, PlusIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export type SidebarSite = {
  id: string;
  name: string;
};

type AppSidebarProps = {
  sites: SidebarSite[];
};

export function AppSidebar({ sites }: AppSidebarProps) {
  const pathname = usePathname();

  const isOverviewActive = pathname === "/" || pathname === "/sites/new";

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <GlobeIcon className="size-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight">
            SitemapSEO
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Verwaltung</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isOverviewActive}
                  render={<Link href="/" />}
                >
                  <ListIcon />
                  <span>Sites</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/sites/new"}
                  render={<Link href="/sites/new" />}
                >
                  <PlusIcon />
                  <span>Neue Site</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {sites.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Sites</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sites.map((site) => {
                  const base = `/sites/${site.id}`;
                  const dashboardActive =
                    pathname === base || pathname?.startsWith(`${base}/`) === true
                      ? !pathname?.endsWith("/settings")
                      : false;
                  const settingsActive = pathname === `${base}/settings`;
                  return (
                    <SidebarMenuItem key={site.id}>
                      <SidebarMenuButton
                        isActive={dashboardActive}
                        render={<Link href={base} />}
                      >
                        <GlobeIcon />
                        <span className="truncate">{site.name}</span>
                      </SidebarMenuButton>
                      <SidebarMenuButton
                        isActive={settingsActive}
                        size="sm"
                        className="pl-8"
                        render={<Link href={`${base}/settings`} />}
                      >
                        <SettingsIcon />
                        <span>Einstellungen</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          v0.1 · Sprint 1
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
