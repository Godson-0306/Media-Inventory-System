"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useRefreshWhile(active: boolean, intervalMs = 10_000) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [active, intervalMs, router]);
}
