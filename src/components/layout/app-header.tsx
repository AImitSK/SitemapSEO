import { LogOutIcon } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
};

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <h1 className="truncate text-sm font-semibold">{title}</h1>
        {subtitle ? (
          <span className="truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </div>
      <Tooltip>
        <TooltipTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <LogOutIcon className="size-3.5" />
          <span>Abmelden</span>
        </TooltipTrigger>
        <TooltipContent>
          Basic-Auth: Browser-Tab schließen, um sich abzumelden.
        </TooltipContent>
      </Tooltip>
    </header>
  );
}
