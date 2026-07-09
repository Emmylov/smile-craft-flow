import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { RequestAccessForm } from "@/components/request-access-form";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Kairos — Talk to our healthcare team" },
      {
        name: "description",
        content:
          "Request a demo, ask about implementation, or partner with Kairos. We reply to every message within one business day.",
      },
      { property: "og:title", content: "Talk to the Kairos team" },
      { property: "og:description", content: "Request a demo or ask us anything about deploying Kairos in your organization." },
    ],
  }),
  component: ContactPage,
});

const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

function ContactPage() {
  return (
    <div className="bg-background text-on-background font-body-md overflow-x-hidden min-h-screen flex flex-col">
      <SiteHeader />

      <section className="relative hero-dark-gradient text-white -mt-14 pt-28 pb-16 overflow-hidden">
        <div className="max-w-container-max mx-auto px-margin-desktop text-center relative z-10">
          <span className="text-[12px] font-bold tracking-widest text-teal uppercase">Get in touch</span>
          <h1 className="font-display-xl text-display-xl mt-4">
            Let's build the future of care <span className="gradient-text">together.</span>
          </h1>
          <p className="text-body-lg text-white/70 max-w-2xl mx-auto mt-4">
            Whether you're evaluating Kairos for your hospital, exploring a partnership, or just curious — we'd love to hear from you.
          </p>
        </div>
      </section>

      <section className="flex-1 py-stack-lg bg-surface-container-low">
        <div className="max-w-container-max mx-auto px-margin-desktop grid lg:grid-cols-5 gap-stack-lg">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-display-lg font-display leading-tight">
              Talk to a real person, <span className="text-primary">every time.</span>
            </h2>
            <p className="text-body-md text-on-surface-variant">
              Every message goes directly to our team. We reply within one business day — no chatbots, no ticket queues.
            </p>
            <div className="space-y-4 pt-2">
              {[
                { icon: "mail", title: "Email us", value: "hello@kairoscareglobal.online", href: "mailto:hello@kairoscareglobal.online" },
                { icon: "call", title: "Call sales", value: "+2347075210013", href: "tel:+2347075210013" },
                { icon: "location_on", title: "HQ", value: "Africa · Lagos · Nigeria" },
              ].map((c) => (
                <div key={c.title} className="flex items-start gap-3 p-4 rounded-xl border border-outline-variant bg-white">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon name={c.icon} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">{c.title}</p>
                    {c.href ? (
                      <a href={c.href} className="text-sm font-semibold hover:text-primary">
                        {c.value}
                      </a>
                    ) : (
                      <p className="text-sm font-semibold">{c.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-3">
              <Icon name="verified_user" className="text-primary" />
              <div className="text-xs text-on-surface-variant">
                Your information is confidential. Kairos is HIPAA, GDPR, and ISO 27001 compliant.
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <RequestAccessForm variant="surface" />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
