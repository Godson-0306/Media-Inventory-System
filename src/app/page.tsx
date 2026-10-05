import {
  AlertTriangle,
  ArrowLeftRight,
  Layers,
  Shield,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AuthPanel } from "@/components/auth/auth-panel";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AndroidDownloadCard } from "@/components/android/download-card";

const features = [
  {
    title: "Serialized assets",
    body: "Every camera, cable, display, and audio unit is tracked as a unique item.",
    icon: Layers,
  },
  {
    title: "Fault visibility",
    body: "Fault reports, repairs, and protected admin handling stay clearly separated from daily operations.",
    icon: AlertTriangle,
  },
  {
    title: "Rentals in / out",
    body: "Track external rentals and organization-owned items leaving for events or clients.",
    icon: ArrowLeftRight,
  },
  {
    title: "Company control",
    body: "The organization owner manages staff, kit, and approvals. Field staff use the phone workspace.",
    icon: Shield,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_32%)]">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-4 px-5 py-6 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10 lg:py-8">
        <section className="flex flex-col justify-center">
          <div className="mb-6 flex items-center justify-between gap-3 lg:mb-10">
            <div className="flex items-center gap-3">
              <Logo />
              <div>
                <p className="font-semibold lg:hidden">Sign in</p>
                <p className="hidden font-semibold lg:block">Asset Operations Platform</p>
                <p className="hidden text-sm text-muted-foreground lg:block">
                  Serialized control for production teams and equipment-intensive organizations.
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <div className="hidden lg:block">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">
              Protected Workspace + Owner Admin
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-foreground md:text-5xl">
              Run equipment operations with structure, accountability, and a genuinely usable dashboard.
            </h1>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border bg-card/70 p-4"
                >
                  <feature.icon className="mb-3 h-5 w-5 text-primary" />
                  <p className="font-medium">{feature.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{feature.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-sm text-muted-foreground">
              Designed for churches, media teams, production companies, and event operations.
              Staff can also{" "}
              <a href="/download" className="text-primary hover:underline">
                install the Android app
              </a>
              .
            </p>
          </div>
        </section>
        <section className="mx-auto w-full max-w-md space-y-4 lg:mx-0 lg:max-w-none">
          <AuthPanel />
          <AndroidDownloadCard compact />
        </section>
      </div>
    </main>
  );
}
