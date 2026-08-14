"use client";

import type { CSSProperties, ReactNode } from "react";
import type { OrgBranding } from "@/lib/org";

export function OrgAccent({
  branding,
  children,
}: {
  branding: OrgBranding | null;
  children: ReactNode;
}) {
  if (!branding?.accentColor) return children;
  const style = {
    "--primary": branding.accentColor,
    "--color-primary": branding.accentColor,
    "--ring": branding.accentColor,
  } as CSSProperties;
  return <div style={style}>{children}</div>;
}
