import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { LogoCarousel } from "@/components/logo-carousel";
import { InteractiveGlobe } from "@/components/globe";
import { RequestAccessForm } from "@/components/request-access-form";

export const Route = createFileRoute("/")({
  component: Index,
});

const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

function Index() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  const scrollToForm = () => {
    document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => document.getElementById("request-form")?.scrollIntoView({ behavior: "smooth", block: "center" }), 500);
  };

  return (
    <div className="bg-background text-on-background font-body-md overflow-x-hidden">
      <SiteHeader onRequest={scrollToForm} />
      {/* Hero */}
      <section id="hero" className="relative pb-stack-lg overflow-hidden hero-dark-gradient text-white scroll-mt-16 -mt-20 pt-36">
        {/* backdrop layers */}
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_center,#fff_1px,transparent_1px)] bg-[size:34px_34px] pointer-events-none"></div>
        <div className="absolute -top-32 -left-24 w-[36rem] h-[36rem] rounded-full bg-primary/30 blur-[120px] pointer-events-none"></div>
        <div className="absolute top-20 -right-24 w-[32rem] h-[32rem] rounded-full bg-violet/30 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-[28rem] h-[28rem] rounded-full bg-teal/20 blur-[120px] pointer-events-none"></div>

        <div className="max-w-container-max mx-auto px-margin-desktop grid lg:grid-cols-2 gap-stack-lg items-center relative z-10">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/15 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse"></span>
              <span className="text-[12px] font-bold tracking-wider text-teal uppercase">Built for Care. Designed for People.</span>
            </div>
            <h1 className="font-display-xl text-display-xl leading-[1.05]">
              Digital infrastructure for <br className="hidden sm:block" />
              <span className="gradient-text">human-centered</span> healthcare.
            </h1>
            <p className="text-body-lg text-white/70 max-w-xl">
              Kairos connects every part of healthcare—people, data, and systems—so professionals can focus on what matters most: caring for people.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button onClick={scrollToForm} className="bg-primary text-on-primary px-7 py-3.5 rounded-full text-label-md font-bold flex items-center gap-2 hover:scale-[1.03] hover:brightness-110 transition-all shadow-xl shadow-primary/40">
                See Kairos in Action <Icon name="arrow_forward" className="text-[20px]" />
              </button>
              <a href="/product" className="border border-white/20 bg-white/5 backdrop-blur-sm text-white px-7 py-3.5 rounded-full text-label-md font-bold flex items-center gap-2 hover:bg-white/10 transition-all">
                Explore the Platform <Icon name="play_circle" className="text-[20px]" />
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-6 pt-4">
              {[
                { value: "2.4M+", label: "Patients connected" },
                { value: "180+", label: "Care facilities" },
                { value: "99.98%", label: "Uptime" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col">
                  <span className="font-display font-extrabold text-xl text-white">{s.value}</span>
                  <span className="text-[11px] text-white/50 uppercase tracking-wide">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-tr from-primary/40 via-violet/30 to-teal/30 blur-3xl rounded-[2rem] pointer-events-none"></div>
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl glow-effect ring-1 ring-white/10">
              <img
                alt="Global Healthcare Connectivity"
                className="w-full object-cover aspect-[16/10]"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBpffpcDm5cT5BrpyHNXwaFDyN7VDBbsgXJsMnp_HImRr6XRubObZWyG4RXkTtGGYkt4o919Fh3DFy-Azing9t5zt1TilVzVXZMnaj5C64KavES6wkG1wEW4S_7YKjF4nfSoNscKCFn8pK9KAAt-WI7ISmgEfwnNfeYN3ICbIRuwavOaIXeyp3X15flETLgtZEm6tExDUy6wipgo0V9r6YC3QBuYZCF_E18W1ujZPgzyTSXXHauw6yFJzI7UkpulrYLzpUlkIrCrWw"
              />
            </div>
            <div className="absolute -top-8 -right-4 z-20 dark-glass p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce ring-1 ring-white/10" style={{ animationDuration: "4s" }}>
              <div className="w-10 h-10 rounded-full bg-teal/20 flex items-center justify-center">
                <Icon name="bolt" className="text-teal text-[20px]" />
              </div>
              <div>
                <p className="text-label-md font-label-md text-white">AI Insight</p>
                <p className="text-[12px] text-white/60">Treatment adherence optimal</p>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-4 z-20 dark-glass p-4 rounded-2xl shadow-xl flex items-center gap-3 ring-1 ring-white/10">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Icon name="groups" className="text-primary-container text-[20px]" />
              </div>
              <div>
                <p className="text-label-md font-label-md text-white">Care Coordination</p>
                <p className="text-[12px] text-white/60">3 teams synced in real-time</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted-by logo strip */}
      <section className="bg-background border-b border-outline-variant/60 py-10">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <p className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-[0.25em] text-center mb-7">
            Trusted by leading healthcare organizations
          </p>
          <LogoCarousel variant="light" />
        </div>
      </section>



      {/* Problem */}
      <section id="problem" className="py-stack-lg bg-surface-container-low/50 scroll-mt-16">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="max-w-3xl mb-16">
            <span className="text-label-md font-label-md text-primary tracking-widest uppercase mb-4 block">The Problem</span>
            <h2 className="text-display-lg font-display mb-6">Healthcare wasn't built to work together. <span className="text-primary">We're changing that.</span></h2>
            <p className="text-body-lg text-on-surface-variant">Fragmented systems. Disconnected data. Overwhelmed teams. Healthcare deserves better than legacy barriers that slow down care.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {[
              { icon: "hub", iconWrap: "bg-error/10", iconColor: "text-error", title: "Disconnected Systems", body: "Critical data scattered across multiple siloed platforms that don't talk to each other." },
              { icon: "psychology", iconWrap: "bg-primary/10", iconColor: "text-primary", title: "Administrative Overload", body: "Doctors spend 50% more time on admin than with patients. Kairos automates the noise." },
              { icon: "sentiment_very_dissatisfied", iconWrap: "bg-violet/10", iconColor: "text-violet", title: "Poor Patient Experience", body: "Long waits, repeated forms, and unclear communication leading to patient frustration." },
              { icon: "trending_down", iconWrap: "bg-teal/10", iconColor: "text-teal", title: "Burnout & Shortage", body: "Clinician burnout is at an all-time high. We build tools that actually support providers." },
            ].map((c) => (
              <div key={c.title} className="bg-white p-8 rounded-2xl border border-outline-variant hover:shadow-xl transition-shadow group">
                <div className={`w-12 h-12 rounded-xl ${c.iconWrap} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <Icon name={c.icon} className={c.iconColor} />
                </div>
                <h3 className="text-headline-md font-display mb-4">{c.title}</h3>
                <p className="text-body-md text-on-surface-variant">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section id="ecosystem" className="py-stack-lg scroll-mt-16">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="text-center mb-16">
            <h2 className="text-display-lg font-display mb-4">One ecosystem. <span className="text-primary">Every connection.</span></h2>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {[
              { icon: "dataset", label: "Kairos Core", active: true },
              { icon: "phone_iphone", label: "Kairos Companion" },
              { icon: "auto_awesome", label: "AI Aura" },
              { icon: "language", label: "Ecosystem" },
              { icon: "public", label: "Global Records" },
            ].map((t) => (
              <button key={t.label} className={`px-6 py-3 rounded-full font-label-md text-label-md flex items-center gap-2 transition-colors ${t.active ? "bg-primary text-on-primary shadow-lg shadow-primary/20" : "bg-surface-container hover:bg-surface-container-highest text-on-surface-variant"}`}>
                <Icon name={t.icon} className="text-[20px]" /> {t.label}
              </button>
            ))}
          </div>
          <div className="grid lg:grid-cols-12 gap-gutter items-center">
            <div className="lg:col-span-7">
              <div className="bg-deep-indigo rounded-2xl p-2 shadow-2xl border border-white/10">
                <img
                  alt="Kairos Core Interface"
                  className="rounded-xl w-full"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAPpDqNCe_czkMkZiI5dAAi17AQlRXAUMaQp4L6oaSU0pEK6Lk4HcVvwc-44ukI5Sa_HdJj3S3LFvLnsenBRTlq8M3tyWaD5_X5pNSuL8DZMPNwPIz_GNOMTO50tQHtJdygajN4h-hP1XVpIGo0siwG83hsfoCnxPTdoi4XOt84mKGXJyrufayWwBngE1THghC3OciwjgpFa46sZJcO7Cz3I_RbvNdZ0AxvPbGdqTpGq9BXuQFZry4EB7_nyIygxqkVipDsRN_fyR8"
                />
              </div>
            </div>
            <div className="lg:col-span-5 lg:pl-12 space-y-8">
              <div>
                <span className="text-label-md font-label-md text-primary tracking-widest uppercase block mb-4">Kairos Core</span>
                <h3 className="text-display-lg font-display leading-tight mb-4">The operating system for modern hospitals.</h3>
                <p className="text-body-md text-on-surface-variant">Kairos Core streamlines clinical workflows, centralizes patient data, and gives healthcare teams the real-time insights they need to deliver exceptional care.</p>
              </div>
              <ul className="space-y-4">
                {["Patient & visit management","Clinical workflows & documentation","EHR & medical records sync","Advanced analytics & reporting"].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <Icon name="check_circle" className="text-primary" />
                    <span className="text-body-md">{t}</span>
                  </li>
                ))}
              </ul>
              <button className="text-primary font-label-md text-label-md flex items-center gap-2 hover:underline group">
                Explore Kairos Core
                <Icon name="arrow_forward" className="text-sm group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* AI Aura */}
      <section id="aura" className="py-stack-lg bg-deep-indigo text-white relative overflow-hidden scroll-mt-16">
        <div className="data-stream top-1/4 opacity-20"></div>
        <div className="data-stream top-2/3 opacity-10" style={{ animationDelay: "-1.5s" }}></div>
        <div className="max-w-container-max mx-auto px-margin-desktop relative z-10">
          <div className="grid lg:grid-cols-2 gap-stack-lg items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-violet/20 border border-violet/30">
                <span className="text-[12px] font-bold text-violet uppercase tracking-wider">AI-Powered Automation</span>
              </div>
              <h2 className="text-display-lg font-display">AI that works behind the scenes so <span className="text-teal">humans can shine.</span></h2>
              <p className="text-body-lg text-white/70">Kairos Aura analyzes data in real-time, surfaces what matters, and helps teams make faster, smarter decisions without the fatigue of data mining.</p>
              <div className="grid sm:grid-cols-2 gap-8">
                {[
                  { icon: "clinical_notes", title: "Clinical decision support", body: "Real-time alerts for critical patient changes." },
                  { icon: "notification_important", title: "Risk alerts & warnings", body: "Predictive modeling for sepsis and readmissions." },
                  { icon: "psychology_alt", title: "Smart documentation", body: "Voice-to-text reduces admin work by up to 60%." },
                  { icon: "insights", title: "Predictive analytics", body: "Forecast department capacity and staffing." },
                ].map((f) => (
                  <div key={f.title} className="space-y-3">
                    <Icon name={f.icon} className="text-teal" />
                    <h4 className="font-bold">{f.title}</h4>
                    <p className="text-sm text-white/60">{f.body}</p>
                  </div>
                ))}
              </div>
              <button className="bg-violet text-white px-8 py-4 rounded-lg text-label-md font-label-md flex items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-violet/30">
                Discover Kairos Aura <Icon name="auto_awesome" className="text-[20px]" />
              </button>
            </div>
            <div className="relative">
              <div className="relative z-10 dark-glass rounded-2xl p-8 border border-white/10">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet/20 flex items-center justify-center">
                      <Icon name="auto_awesome" className="text-violet text-[20px]" />
                    </div>
                    <div>
                      <h4 className="font-bold">AI Aura</h4>
                      <p className="text-[10px] text-white/50 uppercase tracking-widest">Intelligent Clinical Assistant</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal animate-pulse"></span>
                    <span className="text-[10px] text-teal font-bold tracking-widest">ACTIVE</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { icon: "report", wrap: "bg-error/10 border-error/20", tone: "text-error", label: "High Priority Alert", time: "2 min ago", text: "Sepsis risk detected: Room 12B. BP dropping, elevated HR." },
                    { icon: "article", wrap: "bg-violet/10 border-violet/20", tone: "text-violet", label: "Patient Summary", time: "1 min ago", text: "AI generated overview ready for review by Dr. Sarah." },
                    { icon: "lightbulb", wrap: "bg-teal/10 border-teal/20", tone: "text-teal", label: "Care Suggestion", time: "Just now", text: "Labs recommended based on respiratory symptoms." },
                  ].map((a) => (
                    <div key={a.label} className={`p-4 rounded-xl border ${a.wrap} flex gap-4`}>
                      <Icon name={a.icon} className={a.tone} />
                      <div>
                        <div className="flex justify-between items-center mb-1 gap-4">
                          <span className={`text-[12px] font-bold ${a.tone}`}>{a.label}</span>
                          <span className="text-[10px] opacity-40">{a.time}</span>
                        </div>
                        <p className="text-sm">{a.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 bg-violet/20 blur-[100px] -z-10 rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Records */}
      <section id="records" className="py-stack-lg bg-background scroll-mt-16">
        <div className="max-w-container-max mx-auto px-margin-desktop grid lg:grid-cols-2 gap-stack-lg items-center">
          <div className="space-y-8">
            <span className="text-label-md font-label-md text-primary tracking-widest uppercase block">Global Records</span>
            <h2 className="text-display-lg font-display leading-tight">One record. <br /><span className="text-primary">Everywhere</span> care happens.</h2>
            <p className="text-body-lg text-on-surface-variant">Kairos creates a single, lifelong health record that follows patients—across hospitals, cities, and even countries. No more repeated tests or lost histories.</p>
            <ul className="space-y-4">
              {["Interoperable & standards-based (HL7 FHIR)","Secure sharing with patient consent","Always accessible, always up to date"].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <Icon name="verified" className="text-primary" />
                  <span className="text-body-md">{t}</span>
                </li>
              ))}
            </ul>
            <a className="text-primary font-label-md text-label-md flex items-center gap-2 hover:underline group" href="/product">
              See Global Records in action
              <Icon name="arrow_forward" className="text-sm group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
            <InteractiveGlobe size={520} />
            <p className="text-center text-[11px] text-on-surface-variant mt-2 opacity-70">
              Drag to spin · 10+ connected regions
            </p>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-stack-lg bg-deep-indigo text-white scroll-mt-16">
        <div className="max-w-container-max mx-auto px-margin-desktop text-center">
          <span className="text-label-md font-label-md text-teal tracking-widest uppercase block mb-4">Trusted, Secure, Compliant</span>
          <h2 className="text-display-lg font-display mb-6">Security you can <span className="text-electric-blue">trust.</span> <br className="hidden sm:block" />Privacy patients <span className="text-electric-blue">deserve.</span></h2>
          <p className="text-body-lg text-white/70 max-w-2xl mx-auto mb-16">Kairos is built with enterprise-grade security and transparency at its core, meeting the world's most stringent healthcare standards.</p>
          <div className="flex flex-wrap justify-center gap-12 mb-16 opacity-80">
            {[
              { icon: "verified_user", label: "HIPAA" },
              { icon: "gavel", label: "GDPR" },
              { icon: "security", label: "ISO 27001" },
              { icon: "history_edu", label: "HL7 FHIR" },
              { icon: "lock", label: "AES-256" },
            ].map((b) => (
              <div key={b.label} className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center">
                  <Icon name={b.icon} className="text-white text-3xl" />
                </div>
                <span className="text-[12px] font-bold tracking-widest">{b.label}</span>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-left">
            {[
              { icon: "enhanced_encryption", title: "End-to-end encryption", body: "Data is encrypted at rest and in transit using the highest standards." },
              { icon: "admin_panel_settings", title: "Role-based access", body: "Strict controls ensure only authorized personnel see relevant data." },
              { icon: "visibility", title: "Immutable audit logs", body: "Every interaction is logged transparently, ensuring full accountability." },
            ].map((s) => (
              <div key={s.title} className="dark-glass p-6 rounded-xl flex gap-4">
                <Icon name={s.icon} className="text-electric-blue" />
                <div>
                  <h4 className="font-bold mb-1">{s.title}</h4>
                  <p className="text-sm text-white/60">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-stack-lg bg-surface-container-low scroll-mt-16">
        <div className="max-w-container-max mx-auto px-margin-desktop">
          <div className="text-center mb-16">
            <span className="text-label-md font-label-md text-primary tracking-widest uppercase block mb-4">Loved by Healthcare Professionals</span>
            <h2 className="text-display-lg font-display">Real impact. <span className="text-primary">Real people.</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-gutter">
            {[
              { quote: "Kairos transformed our workflow. I spend less time on the computer and more time with my patients. It feels like the system finally works for me, not against me.", name: "Dr. Sarah Okafor", role: "Cardiologist • Lagos, Nigeria", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAoiOTruidVWfqCb0vzanu4OLcDGWAJ1qqNm_jFOK3xQhTmlNVCiCaerxmW3fViFFb5a_0uhjKGfHk2XlbhESpwl9kZrIM4WgLTcIjAozZWn02y8QBLBDe1OBLHGsBk2Du6nI_21ZBsfTvsTRZHYko8vJKJ2YhjlGc_RREbscYa9oOUU83Jq04B2EdELToqORnHeAG9bRwyNwX6UtnXSOkwGe_TnoX1y5IKK4yvRodgxUPlqWXwsz1BV3DZMrxZKBIpGFPmwogwiNg" },
              { quote: "Our ER wait times dropped by 35% within the first month. The visibility and coordination are game-changing for a facility of our size.", name: "Michael Thompson", role: "Hospital Administrator • Dallas, USA", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBW9WyrmeJ4e307PcG_Ncni7etPw09O5cN75HSLfy5pz7CjAcWGOZ9TmoRS3khWrQD1QDIpndkA-HlW8Dow2ylrFKKY-vLMB7rQ-PQyw_0AH6KKO8uS-tMoTvPtLHX7ImjU7AWRFKLfUo8t-DSFqcZN2wk0-ntX2aQUuR0KQijNAEFe5RLr8NUAFDxJE5cJLrMTOZjPZDNIRoqRIvS-YWZKTrBZFkC0m6rffYncVzRIO78KZMq1xcM105meH1VkviOdsmhV9DgXv74" },
              { quote: "As a mom, I finally have all my children's records in one place. It gives me peace of mind knowing any doctor can see their history instantly.", name: "Aisha Bello", role: "Caregiver & Parent • Kano, Nigeria", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBsWupWagDb0AdNyfiYlKsiJz4-So4sK4W1Z4QcfJyPMhH6zr5eehBDesYFQIfKHDQajYhHNkHrCN_GEI6St6K7NQg90HiqwgSFpbNh7VqR_G3tbhbbAF24tPSqdnppOTw6c5HzPvHnXtk56iRiB-Q9IFiHeAWJQvnTgz3z6KftgjNWdeUgHYw0NPPOJ2V6L_mBli1nhyNoxuWGSVdDLJKmAmV-960weSDuACVVzpGmcQRSV9qGjVUB7sYXibo5DFEKupI_YbFFkNc" },
            ].map((t) => (
              <div key={t.name} className="bg-white p-8 rounded-2xl border border-outline-variant shadow-sm flex flex-col h-full">
                <Icon name="format_quote" className="text-primary/30 text-5xl mb-6" />
                <p className="text-body-lg text-on-surface-variant flex-grow mb-8 italic">"{t.quote}"</p>
                <div className="flex items-center gap-4">
                  <img alt={t.name} className="w-12 h-12 rounded-full object-cover" src={t.img} />
                  <div>
                    <p className="font-bold text-on-background">{t.name}</p>
                    <p className="text-[12px] text-on-surface-variant">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="py-stack-lg cta-vibrant-gradient relative overflow-hidden scroll-mt-16">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,#fff_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="max-w-container-max mx-auto px-margin-desktop text-center relative z-10 text-white">
          <h2 className="text-display-xl font-display leading-tight mb-8">Healthcare deserves better systems.<br /><span className="opacity-90">Let's build the future—together.</span></h2>
          <p className="text-body-lg text-white/90 max-w-2xl mx-auto mb-12">Join hospitals, clinics, and healthcare leaders who are already transforming care with Kairos.</p>
          <div className="flex flex-wrap justify-center gap-6">
            <button onClick={scrollToForm} className="bg-white text-primary px-10 py-5 rounded-lg text-label-md font-label-md flex items-center gap-2 hover:scale-105 transition-all shadow-2xl">
              Request a Demo <Icon name="arrow_forward" />
            </button>
            <button onClick={scrollToForm} className="border-2 border-white/30 bg-white/5 backdrop-blur-md text-white px-10 py-5 rounded-lg text-label-md font-label-md flex items-center gap-2 hover:bg-white/10 transition-all">
              Talk to Sales <Icon name="call" />
            </button>
          </div>
          <div className="mt-16 flex flex-wrap justify-center gap-12 text-white/80 font-label-md text-[12px]">
            {["No commitment","Personalized walkthrough","Built for your hospital"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <Icon name="verified" className="text-sm text-teal" /> {t}
              </div>
            ))}
          </div>
          <div className="mt-12">
            <RequestAccessForm />
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

export default Index;
