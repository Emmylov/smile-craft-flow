import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

export type NavItem = { id: string; label: string; type: "anchor" | "route"; to?: string };

const DEFAULT_NAV: NavItem[] = [
  { id: "hero", label: "Home", type: "anchor" },
  { id: "problem", label: "Problem", type: "anchor" },
  { id: "ecosystem", label: "Ecosystem", type: "anchor" },
  { id: "aura", label: "AI Aura", type: "anchor" },
  { id: "records", label: "Global Records", type: "anchor" },
  { id: "product", label: "Product", type: "route", to: "/product" },
  { id: "contact", label: "Contact", type: "route", to: "/contact" },
];

export function SiteHeader({ onRequest }: { onRequest?: () => void }) {
  const [active, setActive] = useState("hero");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const onHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!onHome) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    DEFAULT_NAV.filter((n) => n.type === "anchor").forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [onHome]);

  const handleAnchor = (id: string) => async (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    if (!onHome) {
      await navigate({ to: "/", hash: id });
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 60);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const requestAccess = () => {
    setOpen(false);
    if (onHome && onRequest) return onRequest();
    navigate({ to: "/contact" });
  };

  const isActive = (n: NavItem) => {
    if (n.type === "route") return location.pathname === n.to;
    return onHome && active === n.id;
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all ${
        scrolled ? "backdrop-blur-xl bg-background/85 border-b border-outline-variant shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="max-w-container-max mx-auto px-margin-desktop h-14 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-violet flex items-center justify-center shadow-md shadow-primary/30 group-hover:scale-110 transition-transform">
            <Icon name="favorite" className="text-white text-[16px]" />
          </div>
          <span className="font-display font-bold text-sm">Kairos</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-0.5 min-w-0">
          {DEFAULT_NAV.map((n) =>
            n.type === "route" ? (
              <Link
                key={n.id}
                to={n.to!}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive(n)
                    ? "text-primary bg-primary/10"
                    : "text-on-surface-variant hover:text-on-background hover:bg-surface-container"
                }`}
              >
                {n.label}
              </Link>
            ) : (
              <a
                key={n.id}
                href={`/#${n.id}`}
                onClick={handleAnchor(n.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive(n)
                    ? "text-primary bg-primary/10"
                    : "text-on-surface-variant hover:text-on-background hover:bg-surface-container"
                }`}
              >
                {n.label}
              </a>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={requestAccess}
            className="bg-primary text-on-primary px-4 py-2 rounded-md text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0 shadow-md shadow-primary/20"
          >
            Request Access
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 rounded-md hover:bg-surface-container"
            aria-label="Menu"
          >
            <Icon name={open ? "close" : "menu"} className="text-[22px]" />
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-outline-variant bg-background/95 backdrop-blur-xl">
          <nav className="max-w-container-max mx-auto px-margin-desktop py-3 flex flex-col gap-1">
            {DEFAULT_NAV.map((n) =>
              n.type === "route" ? (
                <Link
                  key={n.id}
                  to={n.to!}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 rounded-md text-sm font-medium text-on-surface-variant hover:bg-surface-container"
                >
                  {n.label}
                </Link>
              ) : (
                <a
                  key={n.id}
                  href={`/#${n.id}`}
                  onClick={handleAnchor(n.id)}
                  className="px-3 py-2 rounded-md text-sm font-medium text-on-surface-variant hover:bg-surface-container"
                >
                  {n.label}
                </a>
              ),
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-deep-indigo text-white/70 py-12">
      <div className="max-w-container-max mx-auto px-margin-desktop grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-violet flex items-center justify-center">
              <Icon name="favorite" className="text-white text-[16px]" />
            </div>
            <span className="font-display font-bold text-white">Kairos</span>
          </div>
          <p className="text-xs text-white/50 max-w-xs">Digital infrastructure for human-centered healthcare.</p>
        </div>
        <div>
          <h4 className="text-white text-xs font-bold tracking-widest uppercase mb-3">Product</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/product" className="hover:text-white">Overview</Link></li>
            <li><Link to="/product" hash="core" className="hover:text-white">Kairos Core</Link></li>
            <li><Link to="/product" hash="aura" className="hover:text-white">AI Aura</Link></li>
            <li><Link to="/product" hash="records" className="hover:text-white">Global Records</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white text-xs font-bold tracking-widest uppercase mb-3">Company</h4>
          <ul className="space-y-2 text-xs">
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            <li><a href="/#security" className="hover:text-white">Security</a></li>
            <li><a href="/#testimonials" className="hover:text-white">Customer stories</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white text-xs font-bold tracking-widest uppercase mb-3">Get in touch</h4>
          <p className="text-xs">Request access, book a demo, or ask a question.</p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 mt-3 text-xs font-semibold text-teal hover:text-white"
          >
            Contact us <Icon name="arrow_forward" className="text-[16px]" />
          </Link>
        </div>
      </div>
      <div className="max-w-container-max mx-auto px-margin-desktop mt-10 pt-6 border-t border-white/10 flex flex-wrap justify-between items-center gap-3 text-[11px] text-white/40">
        <span>© {new Date().getFullYear()} Kairos Health, Inc.</span>
        <span>HIPAA · GDPR · ISO 27001 · HL7 FHIR</span>
      </div>
    </footer>
  );
}