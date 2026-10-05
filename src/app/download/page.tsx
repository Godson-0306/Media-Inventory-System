import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AndroidDownloadCard } from "@/components/android/download-card";
import Link from "next/link";

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-background bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_32%)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <p className="font-semibold">Get the Android app</p>
              <p className="text-sm text-muted-foreground">Sideload the APK from this site.</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <AndroidDownloadCard />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          iPhone cannot install this file. Use Safari on the website instead.{" "}
          <Link href="/" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
