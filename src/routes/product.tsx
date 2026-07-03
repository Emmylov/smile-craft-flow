import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { InteractiveGlobe } from "@/components/globe";

export const Route = createFileRoute("/product")({
  head: () => ({
    meta: [
      { title: "Product — Kairos platform for modern healthcare" },
      {
        name: "description",
        content:
          "Explore the Kairos platform: Kairos Core, AI Aura, and Global Records — one operating system for care coordination, clinical workflows, and lifelong health records.",
      },
      { property: "og:title", content: "The Kairos Platform" },
      {
        property: "og:description",
        content: "One operating system for modern hospitals — Kairos Core, AI Aura, and Global Records.",
      },
    ],
  }),
  component: ProductPage,
});

const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

function ProductPage() {
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  return (
    <div className="bg-background text-on-background font-body-md overflow-x-hidden">
      <SiteHeader />

      {/* Hero */}
      <section className="relative py-stack-lg hero-dark-gradient text-white overflow-hidden -mt-14 pt-24">
        <div className="max-w-container-max mx-auto px-margin-desktop text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-container/20 border border-primary-container/30 mb-6">
            <span className="text-[12px] font-bold tracking-wider text-teal uppercase">The Kairos Platform</span>
          </div>
          <h1 className="font-display-xl text-display-xl mb-6">
            One ecosystem. <span className="gradient-text">Every connection.</span>
          </h1>
          <p className="text-body-lg text-white/70 max-w-2xl mx-auto">
            Three deeply integrated products that give hospitals a single, human-centered operating system for care.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {[
              { href: "#core", label: "Kairos Core", icon: "dataset" },
              { href: "#companion", label: "Kairos Companion", icon: "phone_iphone" },
              { href: "#aura", label: "AI Aura", icon: "auto_awesome" },
              { href: "#records", label: "Global Records", icon: "public" },
            ].map((p) => (
              <a
                key={p.label}
                href={p.href}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <Icon name={p.icon} className="text-[18px] text-teal" /> {p.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Kairos Core */}
      <section id="core" className="py-stack-lg scroll-mt-16">
        <div className="max-w-container-max mx-auto px-margin-desktop grid lg:grid-cols-12 gap-stack-lg items-center">
          <div className="lg:col-span-7">
            <div className="bg-deep-indigo rounded-2xl p-2 shadow-2xl border border-white/10">
              <img
                alt="Kairos Core Interface"
                className="rounded-xl w-full"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAPpDqNCe_czkMkZiI5dAAi17AQlRXAUMaQp4L6oaSU0pEK6Lk4HcVvwc-44ukI5Sa_HdJj3S3LFvLnsenBRTlq8M3tyWaD5_X5pNSuL8DZMPNwPIz_GNOMTO50tQHtJdygajN4h-hP1XVpIGo0siwG83hsfoCnxPTdoi4XOt84mKGXJyrufayWwBngE1THghC3OciwjgpFa46sZJcO7Cz3I_RbvNdZ0AxvPbGdqTpGq9BXuQFZry4EB7_nyIygxqkVipDsRN_fyR8"
              />
            </div>
          </div>
          <div className="lg:col-span-5 lg:pl-8 space-y-6">
            <span className="text-label-md font-label-md text-primary tracking-widest uppercase block">Kairos Core</span>
            <h2 className="text-display-lg font-display leading-tight">The operating system for modern hospitals.</h2>
            <p className="text-body-md text-on-surface-variant">
              Kairos Core streamlines clinical workflows, centralizes patient data, and gives healthcare teams the
              real-time insights they need to deliver exceptional care.
            </p>
            <ul className="space-y-3">
              {[
                "Patient & visit management",
                "Clinical workflows & documentation",
                "EHR & medical records sync",
                "Advanced analytics & reporting",
                "Bed management & department capacity",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <Icon name="check_circle" className="text-primary" />
                  <span className="text-body-md">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Companion */}
      <section id="companion" className="py-stack-lg bg-surface-container-low scroll-mt-16">
        <div className="max-w-container-max mx-auto px-margin-desktop grid lg:grid-cols-2 gap-stack-lg items-center">
          <div className="space-y-6 order-2 lg:order-1">
            <span className="text-label-md font-label-md text-primary tracking-widest uppercase block">Kairos Companion</span>
            <h2 className="text-display-lg font-display leading-tight">Care in the palm of every patient's hand.</h2>
            <p className="text-body-md text-on-surface-variant">
              A mobile companion that reminds, educates, and empowers — reducing missed appointments and giving
              caregivers a private line to their care team.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: "medication", title: "Medication reminders" },
                { icon: "event_available", title: "Smart appointments" },
                { icon: "chat", title: "Secure messaging" },
                { icon: "health_metrics", title: "Symptom tracking" },
              ].map((f) => (
                <div key={f.title} className="p-4 rounded-xl border border-outline-variant bg-white flex items-center gap-3">
                  <Icon name={f.icon} className="text-primary" />
                  <span className="text-sm font-semibold">{f.title}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2 flex justify-center">
            <div className="w-64 aspect-[9/19] rounded-[2.5rem] bg-deep-indigo p-2 shadow-2xl border-4 border-black/40">
              <div className="w-full h-full rounded-[2rem] bg-gradient-to-br from-primary/40 via-violet/30 to-teal/30 relative overflow-hidden flex flex-col p-4 text-white">
                <div className="text-[10px] opacity-60 uppercase tracking-widest">Good morning, Aisha</div>
                <div className="mt-2 text-lg font-bold">Today's care plan</div>
                <div className="mt-4 space-y-2">
                  {["9:00 · Take metformin", "11:30 · Video visit with Dr. Sarah", "Log evening reading"].map((t) => (
                    <div key={t} className="text-xs bg-white/10 backdrop-blur rounded-lg px-3 py-2 border border-white/10">
                      {t}
                    </div>
                  ))}
                </div>
                <div className="mt-auto p-3 rounded-xl bg-white/15 border border-white/20">
                  <div className="text-[10px] uppercase tracking-widest opacity-70">Adherence</div>
                  <div className="text-2xl font-bold">96%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Aura */}
      <section id="aura" className="py-stack-lg bg-deep-indigo text-white scroll-mt-16">
        <div className="max-w-container-max mx-auto px-margin-desktop grid lg:grid-cols-2 gap-stack-lg items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-violet/20 border border-violet/30">
              <span className="text-[12px] font-bold text-violet uppercase tracking-wider">AI Aura</span>
            </div>
            <h2 className="text-display-lg font-display">
              AI that surfaces what matters — <span className="text-teal">before it's a crisis.</span>
            </h2>
            <p className="text-body-lg text-white/70">
              Aura runs quietly in the background, monitoring vitals and workflows to flag risk, draft notes, and
              recommend next steps for your care teams.
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { icon: "monitor_heart", title: "Sepsis early warning", body: "Predictive risk scoring across every admission." },
                { icon: "edit_note", title: "Ambient documentation", body: "Voice-to-text notes reduce charting by up to 60%." },
                { icon: "insights", title: "Capacity forecasting", body: "Predict department load 48 hours ahead." },
                { icon: "chat_apps_script", title: "Care recommendations", body: "Evidence-based next-step suggestions." },
              ].map((f) => (
                <div key={f.title} className="space-y-2">
                  <Icon name={f.icon} className="text-teal" />
                  <h4 className="font-bold">{f.title}</h4>
                  <p className="text-sm text-white/60">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="dark-glass rounded-2xl p-6 border border-white/10 space-y-4">
            {[
              { icon: "report", wrap: "bg-error/10 border-error/20", tone: "text-error", label: "High Priority Alert", text: "Sepsis risk detected: Room 12B. BP dropping, elevated HR." },
              { icon: "article", wrap: "bg-violet/10 border-violet/20", tone: "text-violet", label: "Patient Summary", text: "AI generated overview ready for review by Dr. Sarah." },
              { icon: "lightbulb", wrap: "bg-teal/10 border-teal/20", tone: "text-teal", label: "Care Suggestion", text: "Labs recommended based on respiratory symptoms." },
            ].map((a) => (
              <div key={a.label} className={`p-4 rounded-xl border ${a.wrap} flex gap-4`}>
                <Icon name={a.icon} className={a.tone} />
                <div>
                  <span className={`text-[12px] font-bold ${a.tone} block mb-1`}>{a.label}</span>
                  <p className="text-sm">{a.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Records */}
      <section id="records" className="py-stack-lg scroll-mt-16">
        <div className="max-w-container-max mx-auto px-margin-desktop grid lg:grid-cols-2 gap-stack-lg items-center">
          <div className="space-y-6">
            <span className="text-label-md font-label-md text-primary tracking-widest uppercase block">Global Records</span>
            <h2 className="text-display-lg font-display leading-tight">
              One record. <span className="text-primary">Everywhere</span> care happens.
            </h2>
            <p className="text-body-lg text-on-surface-variant">
              A lifelong health record that follows patients across hospitals, cities, and countries — built on open
              standards and patient-controlled sharing.
            </p>
            <ul className="space-y-3">
              {[
                "Interoperable & standards-based (HL7 FHIR)",
                "Secure sharing with patient consent",
                "Always accessible, always up to date",
                "Cross-border reciprocity with global partners",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <Icon name="verified" className="text-primary" />
                  <span className="text-body-md">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
            <InteractiveGlobe size={480} />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}