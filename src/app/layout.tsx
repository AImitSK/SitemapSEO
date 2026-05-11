import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppSidebar, type SidebarSite } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { listSites } from "@/lib/sites/queries";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SitemapSEO",
  description:
    "SEO-Optimierung von WordPress-Websites mit Yoast – Sitemap, KI-Vorschläge und Push mit Backup.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const allSites = await listSites();
  const sidebarSites: SidebarSite[] = allSites.map((site) => ({
    id: site.id,
    name: site.name,
  }));

  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <TooltipProvider delay={200}>
          <SidebarProvider>
            <AppSidebar sites={sidebarSites} />
            <SidebarInset>{children}</SidebarInset>
          </SidebarProvider>
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
