import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-lg border border-border bg-muted/60 px-3 text-base text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 md:text-sm",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
