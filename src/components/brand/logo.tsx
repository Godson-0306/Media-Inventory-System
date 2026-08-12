import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary",
        className,
      )}
    >
      <Layers className="h-5 w-5" />
    </span>
  );
}
