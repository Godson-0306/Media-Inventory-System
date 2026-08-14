import { Logo } from "@/components/brand/logo";
import { JoinCodeForm } from "@/components/auth/join-code-form";
import Link from "next/link";

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_28%),linear-gradient(180deg,#0b0f19_0%,#0a1120_100%)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <Logo />
          <div>
            <p className="font-semibold">Join a company</p>
            <p className="text-sm text-muted-foreground">
              Enter the code from your organization owner.
            </p>
          </div>
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
