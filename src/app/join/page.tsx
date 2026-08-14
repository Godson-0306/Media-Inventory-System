import { Logo } from "@/components/brand/logo";
import { JoinCodeForm } from "@/components/auth/join-code-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import Link from "next/link";

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-background bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_32%)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <p className="font-semibold">Join a company</p>
              <p className="text-sm text-muted-foreground">
                Enter the code from your organization owner.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <JoinCodeForm />
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
