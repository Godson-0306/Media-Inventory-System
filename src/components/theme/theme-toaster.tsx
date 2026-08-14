"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/theme/theme-provider";

export function ThemeToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      position="top-right"
      toastOptions={{
        className: "border border-border bg-card text-foreground",
      }}
    />
  );
}
