import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { encodeWav } from "@/lib/aura-voice";
import { toast } from "sonner";
import { AuraMark } from "@/components/aura-mark";

type DictationResult = {
  transcript: string;
  complaint: string;
  diagnosis: string;
  notes: string;
  patientFileNote: string;
};

export function ClinicalDictationPanel({
  patientId,
  patientName,
  onOrganized,
}: {
  patientId: string;
  patientName: string;
  onOrganized: (result: DictationResult) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const node = context.createScriptProcessor(4096, 1, 1);
      chunksRef.current = [];
      node.onaudioprocess = (event) => chunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      source.connect(node);
      node.connect(context.destination);
      streamRef.current = stream;
      contextRef.current = context;
      sourceRef.current = source;
      nodeRef.current = node;
      setTranscript("");
      setRecording(true);
    } catch {
      toast.error("Microphone access is needed for Aura dictation.");
    }
  };

  const stop = async () => {
    setRecording(false);
    setProcessing(true);
    const context = contextRef.current;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    nodeRef.current?.disconnect();
    sourceRef.current?.disconnect();
    const blob = encodeWav(chunksRef.current, context?.sampleRate ?? 48_000);
    await context?.close();
    if (blob.size < 2048) {
      setProcessing(false);
      toast.error("That recording was empty — please try again.");
      return;
    }
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Please sign in again before using dictation.");
      const form = new FormData();
      form.append("audio", blob, "recording.wav");
      form.append("patientId", patientId);
      form.append("patientName", patientName);
      const response = await fetch("/api/aura/dictate", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      const result = (await response.json()) as DictationResult & { error?: string };
      if (!response.ok) throw new Error(result.error || "Aura could not process this dictation.");
      setTranscript(result.transcript);
      onOrganized(result);
      toast.success("Aura organized the dictation into the patient file.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dictation failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <AuraMark size="sm" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">Aura dictation</div>
          <h3 className="font-semibold text-slate-950">Dictate symptoms into the digital file</h3>
          <p className="mt-1 text-sm text-slate-600">Aura transcribes the doctor’s voice and organizes it into chief complaint, diagnosis, and clinical notes for review.</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {!recording ? (
          <button onClick={start} disabled={processing} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
            <span className="material-symbols-outlined text-[18px]">mic</span>
            {processing ? "Aura organizing…" : "Start dictation"}
          </button>
        ) : (
          <button onClick={stop} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
            <span className="material-symbols-outlined text-[18px]">stop_circle</span>
            Stop and organize
          </button>
        )}
        {recording && <span className="text-xs font-medium text-red-600">Recording…</span>}
      </div>
      {transcript && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{transcript}</div>}
    </div>
  );
}
