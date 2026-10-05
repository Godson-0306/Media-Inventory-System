"use client";

import { Smartphone } from "lucide-react";
import { ANDROID_APK_HREF } from "@/lib/android";

export function AndroidDownloadCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xl sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Smartphone className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">Android app</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Install on a phone for field sign-out and live location. No Play Store needed.
          </p>
        </div>
      </div>
      <a
        href={ANDROID_APK_HREF}
        download="asset-operations.apk"
        className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
      >
        Download Android app
      </a>
      {compact ? null : (
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Open the downloaded file.</li>
          <li>Allow install from this browser if Android asks.</li>
          <li>Open Asset Operations and sign in.</li>
        </ol>
      )}
    </div>
  );
}
