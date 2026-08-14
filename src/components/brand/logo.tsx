import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  src,
  alt = "Organization logo",
}: {
  className?: string;
  src?: string | null;
  alt?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn("h-9 w-9 rounded-lg object-cover", className)}
      />
    );
  }
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
