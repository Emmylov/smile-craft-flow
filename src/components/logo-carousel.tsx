import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";

const LOGO_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_LOGO_DEV_API_KEY as string | undefined;

const ORGS: { name: string; domain: string }[] = [
  { name: "Mayo Clinic", domain: "mayoclinic.org" },
  { name: "Cleveland Clinic", domain: "clevelandclinic.org" },
  { name: "Johns Hopkins Medicine", domain: "hopkinsmedicine.org" },
  { name: "Memorial Sloan Kettering", domain: "mskcc.org" },
  { name: "Kaiser Permanente", domain: "kp.org" },
  { name: "Mount Sinai", domain: "mountsinai.org" },
  { name: "Stanford Health Care", domain: "stanfordhealthcare.org" },
  { name: "Massachusetts General", domain: "massgeneral.org" },
  { name: "NewYork-Presbyterian", domain: "nyp.org" },
  { name: "UCLA Health", domain: "uclahealth.org" },
  { name: "Cedars-Sinai", domain: "cedars-sinai.org" },
  { name: "Pfizer", domain: "pfizer.com" },
  { name: "Johnson & Johnson", domain: "jnj.com" },
  { name: "GE HealthCare", domain: "gehealthcare.com" },
  { name: "Medtronic", domain: "medtronic.com" },
  { name: "Abbott", domain: "abbott.com" },
];

export function LogoCarousel({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const [emblaRef] = useEmblaCarousel(
    { loop: true, dragFree: true, align: "start", containScroll: false },
    [AutoScroll({ speed: 0.7, startDelay: 0, stopOnInteraction: false, stopOnMouseEnter: true })],
  );

  const logoUrl = (domain: string) =>
    LOGO_KEY
      ? `https://img.logo.dev/${domain}?token=${LOGO_KEY}&size=200&format=png&fallback=monogram`
      : "";

  const isDark = variant === "dark";

  return (
    <div
      className="relative overflow-hidden"
      style={{
        maskImage: "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)",
      }}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex items-center gap-x-14 sm:gap-x-16 py-3">
          {LOGO_KEY
            ? [...ORGS, ...ORGS].map((org, i) => (
                <img
                  key={`${org.domain}-${i}`}
                  src={logoUrl(org.domain)}
                  alt={`${org.name} logo`}
                  title={org.name}
                  width={120}
                  height={40}
                  loading="lazy"
                  className={`shrink-0 h-8 sm:h-9 w-auto object-contain transition-all duration-300 ${
                    isDark
                      ? "brightness-0 invert opacity-60 hover:opacity-100"
                      : "grayscale opacity-70 hover:grayscale-0 hover:opacity-100"
                  }`}
                />
              ))
            : [...ORGS, ...ORGS].map((org, i) => (
                <span
                  key={`${org.domain}-${i}`}
                  className={`shrink-0 whitespace-nowrap font-display font-semibold text-sm ${
                    isDark ? "text-white/60" : "text-on-surface-variant"
                  }`}
                >
                  {org.name}
                </span>
              ))}
        </div>
      </div>
    </div>
  );
}
