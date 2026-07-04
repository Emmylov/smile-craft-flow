import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import kairosLogo from "@/assets/kairos-logo.png.asset.json";

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
    <header className="sticky top-0 z-50 pointer-events-none">
      <div
        className={`pointer-events-auto mx-auto mt-3 max-w-container-max px-3 transition-all duration-300 ${
          scrolled ? "px-3" : "px-margin-desktop"
        }`}
      >
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl transition-all duration-300 ${
            scrolled
              ? "h-14 px-3 sm:px-4 bg-background/80 backdrop-blur-xl border border-outline-variant shadow-lg shadow-primary/5"
              : "h-16 px-3 sm:px-5 bg-transparent border border-transparent"
          }`}
        >
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <img
              src={kairosLogo.url}
              alt="Kairos logo"
              width={36}
              height={36}
              className="h-9 w-9 object-contain transition-transform duration-300 group-hover:rotate-[18deg] group-hover:scale-110"
            />
            <span
              className={`font-display font-extrabold text-lg tracking-tight ${
                scrolled ? "text-on-background" : "text-on-background"
              }`}
            >
              Kairos
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 rounded-full bg-surface-container/60 backdrop-blur-sm px-1.5 py-1 border border-outline-variant/50">
            {DEFAULT_NAV.map((n) =>
              n.type === "route" ? (
                <Link
                  key={n.id}
                  to={n.to!}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all ${
                    isActive(n)
                      ? "text-on-primary bg-primary shadow-sm shadow-primary/30"
                      : "text-on-surface-variant hover:text-on-background hover:bg-surface-container-highest"
                  }`}
                >
                  {n.label}
                </Link>
              ) : (
                <a
                  key={n.id}
                  href={`/#${n.id}`}
                  onClick={handleAnchor(n.id)}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all ${
                    isActive(n)
                      ? "text-on-primary bg-primary shadow-sm shadow-primary/30"
                      : "text-on-surface-variant hover:text-on-background hover:bg-surface-container-highest"
                  }`}
                >
                  {n.label}
                </a>
              ),
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:inline-flex text-on-background/80 hover:text-on-background px-4 py-2 rounded-full text-[13px] font-semibold">
              Sign in
            </Link>
            <Link
              to="/onboarding"
              className="hidden sm:inline-flex bg-primary text-on-primary px-5 py-2.5 rounded-full text-[13px] font-bold hover:brightness-110 hover:scale-[1.03] transition-all shrink-0 shadow-lg shadow-primary/25"
            >
              Launch Kairos Core
            </Link>
            <button
              onClick={() => setOpen(!open)}
              className="lg:hidden p-2 rounded-full hover:bg-surface-container text-on-background"
              aria-label="Menu"
            >
              <Icon name={open ? "close" : "menu"} className="text-[24px]" />
            </button>
          </div>
        </div>
      </div>


      {open && (
        <div className="lg:hidden pointer-events-auto mx-3 mt-2 rounded-2xl border border-outline-variant bg-background/95 backdrop-blur-xl shadow-xl">
          <nav className="p-3 flex flex-col gap-1">
            {DEFAULT_NAV.map((n) =>
              n.type === "route" ? (
                <Link
                  key={n.id}
                  to={n.to!}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
                >
                  {n.label}
                </Link>
              ) : (
                <a
                  key={n.id}
                  href={`/#${n.id}`}
                  onClick={handleAnchor(n.id)}
                  className="px-3 py-2.5 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
                >
                  {n.label}
                </a>
              ),
            )}
            <button
              onClick={requestAccess}
              className="mt-1 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-primary/20"
            >
              Request Access
            </button>
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
          <div className="flex items-center gap-2.5 mb-3">
            <img src={kairosLogo.url} alt="Kairos logo" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="font-display font-extrabold text-lg text-white tracking-tight">Kairos</span>
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