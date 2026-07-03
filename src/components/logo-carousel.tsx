import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";

const LOGO_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_LOGO_DEV_API_KEY as string | undefined;

const ORGS: { name: string; domain: string }[] = [
  { name: "Mayo Clinic", domain: "mayoclinic.org" },
  { name: "Cleveland Clinic", domain: "clevelandclinic.org" },
  { name: "Johns Hopkins Medicine", domain: "hopkinsmedicine.org" },
  { name: "Memorial Sloan Kettering", domain: "mskcc.org" },
  { name: "Kaiser Permanente", domain: "kp.org" },
  { name: "NHS", domain: "nhs.uk" },
  { name: "Mount Sinai", domain: "mountsinai.org" },
  { name: "Stanford Health Care", domain: "stanfordhealthcare.org" },
  { name: "Massachusetts General", domain: "massgeneral.org" },
  { name: "NewYork-Presbyterian", domain: "nyp.org" },
  { name: "UCLA Health", domain: "uclahealth.org" },
  { name: "Cedars-Sinai", domain: "cedars-sinai.org" },
];

export function LogoCarousel({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const [emblaRef] = useEmblaCarousel(
    { loop: true, dragFree: true, align: "start", containScroll: false },
    [AutoScroll({ speed: 0.7, startDelay: 0, stopOnInteraction: false, stopOnMouseEnter: true })],
  );

  const logoUrl = (domain: string) =>
    LOGO_KEY
      ? `https://img.logo.dev/${domain}?token=${LOGO_KEY}&size=140&format=png&fallback=monogram`
      : "";

  const isDark = variant === "dark";

  return (
    <div
      className="relative overflow-hidden"
      style={{
        maskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
      }}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-10 py-2">
          {[...ORGS, ...ORGS].map((org, i) => (
            <div
              key={`${org.domain}-${i}`}
              className={`shrink-0 flex items-center gap-3 px-5 py-3 rounded-xl border ${
                isDark
                  ? "border-white/10 bg-white/5 backdrop-blur-sm"
                  : "border-outline-variant bg-white/70"
              }`}
              title={org.name}
            >
              {LOGO_KEY ? (
                <img
                  src={logoUrl(org.domain)}
                  alt={`${org.name} logo`}
                  width={28}
                  height={28}
                  loading="lazy"
                  className={`h-7 w-7 object-contain rounded ${isDark ? "brightness-0 invert opacity-90" : ""}`}
                />
              ) : null}
              <span
                className={`text-xs font-semibold whitespace-nowrap ${
                  isDark ? "text-white/80" : "text-on-surface-variant"
                }`}
              >
                {org.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}