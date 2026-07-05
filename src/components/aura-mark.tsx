import kairosLogo from "@/assets/kairos-logo.png.asset.json";

export function AuraMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dimensions = size === "lg" ? "w-28 h-28" : size === "sm" ? "w-10 h-10" : "w-16 h-16";
  const inner = size === "lg" ? "inset-7" : size === "sm" ? "inset-2.5" : "inset-4";
  return (
    <div className={`relative ${dimensions} shrink-0 aura-orbit`}>
      <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl" />
      <div className="absolute inset-0 rounded-full border border-cyan-300/30" />
      <div className="absolute inset-2 rounded-full border border-violet-300/30 animate-[spin_8s_linear_infinite]" />
      <img src={kairosLogo.url} alt="Aura" className={`absolute ${inner} rounded-full object-cover drop-shadow-[0_0_18px_rgba(96,165,250,.75)]`} />
    </div>
  );
}
