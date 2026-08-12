import {
  AlertTriangle,
  ArrowLeftRight,
  Layers,
  Shield,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AuthPanel } from "@/components/auth/auth-panel";

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
    title: "Locked admin mode",
    body: "Sensitive actions always require password confirmation before access.",
    icon: Shield,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_28%),linear-gradient(180deg,#0b0f19_0%,#0a1120_100%)]">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <section>
          <div className="mb-10 flex items-center gap-3">
            <Logo />
            <div>
              <p className="font-semibold">Asset Operations Platform</p>
              <p className="text-sm text-muted-foreground">
                Serialized control for production teams and equipment-intensive organizations.
              </p>
            </div>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">
            Protected Workspace + Admin Split
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-white md:text-5xl">
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
          </p>
        </section>
        <section>
          <AuthPanel />
        </section>
      </div>
    </main>
  );
}
