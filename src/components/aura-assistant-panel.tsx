import { Link } from "@tanstack/react-router";
import { AuraMark } from "@/components/aura-mark";

const PROMPTS = [
  "Summarize today’s operational bottlenecks",
  "Which departments need attention right now?",
  "Draft a shift handover for open clinical tasks",
];

export function AuraAssistantPanel() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" />
      <div className="flex items-start gap-4">
        <AuraMark size="md" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">Aura · Operating intelligence</div>
          <h3 className="mt-1 font-semibold text-slate-950">Contextual assistant for Kairos Core</h3>
          <p className="mt-1 text-sm text-slate-600">
            Aura knows the current hospital workspace and can help with patient flow, clinical notes, referrals, labs, pharmacy, and staff coordination.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {PROMPTS.map((prompt) => (
              <Link key={prompt} to="/aura" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                {prompt}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <Link to="/aura" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
        Open Aura workspace <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </Link>
    </div>
  );
}
