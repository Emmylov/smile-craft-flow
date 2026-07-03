import { useState } from "react";

const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

type FormState = { name: string; email: string; organization: string; message: string };
type Status = "idle" | "submitting" | "success" | "error";

export function RequestAccessForm({ variant = "light" }: { variant?: "light" | "surface" }) {
  const [form, setForm] = useState<FormState>({ name: "", email: "", organization: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = "Please enter your name";
    else if (form.name.trim().length > 100) e.name = "Name is too long";
    const email = form.email.trim();
    if (!email) e.email = "Please enter your email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address";
    else if (email.length > 255) e.email = "Email is too long";
    if (form.organization.length > 150) e.organization = "Organization name is too long";
    if (form.message.length > 1000) e.message = "Message must be under 1000 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErrorMsg("");
    if (!validate()) return;
    setStatus("submitting");
    try {
      const res = await fetch("https://formsubmit.co/ajax/emmanuellaiyayi5@gmail.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `Kairos — Access request from ${form.name}`,
          _template: "table",
          _captcha: "false",
          name: form.name.trim(),
          email: form.email.trim(),
          organization: form.organization.trim(),
          message: form.message.trim(),
          source: "Kairos website",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data && data.success === "false")) throw new Error(data?.message || "Request failed");
      setStatus("success");
      setForm({ name: "", email: "", organization: "", message: "" });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const field = (k: keyof FormState) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm({ ...form, [k]: e.target.value });
      if (errors[k]) setErrors({ ...errors, [k]: undefined });
    },
  });

  const shell =
    variant === "surface"
      ? "bg-white rounded-2xl border border-outline-variant p-6 shadow-xl"
      : "bg-white/95 text-on-background rounded-2xl border border-white/20 p-6 shadow-2xl";

  if (status === "success") {
    return (
      <div id="request-form" className={`max-w-xl mx-auto text-center ${shell}`}>
        <div className="w-12 h-12 rounded-full bg-teal/20 mx-auto mb-3 flex items-center justify-center">
          <Icon name="check_circle" className="text-teal text-3xl" />
        </div>
        <h3 className="text-headline-md font-display mb-2">Request received</h3>
        <p className="text-body-md text-on-surface-variant mb-4">
          Thanks for reaching out. Our team will be in touch shortly.
        </p>
        <button onClick={() => setStatus("idle")} className="text-primary text-sm font-semibold hover:underline">
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form
      id="request-form"
      onSubmit={onSubmit}
      noValidate
      className={`max-w-xl mx-auto text-left space-y-4 ${shell}`}
    >
      <div className="text-center mb-2">
        <h3 className="text-headline-md font-display text-on-background">Request Access</h3>
        <p className="text-xs text-on-surface-variant">We'll email you back within one business day.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-on-surface-variant">Name *</label>
          <input
            {...field("name")}
            type="text"
            maxLength={100}
            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 ${errors.name ? "border-error" : "border-outline-variant"}`}
            placeholder="Dr. Jane Smith"
          />
          {errors.name && <p className="text-[11px] text-error mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-on-surface-variant">Email *</label>
          <input
            {...field("email")}
            type="email"
            maxLength={255}
            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 ${errors.email ? "border-error" : "border-outline-variant"}`}
            placeholder="you@hospital.org"
          />
          {errors.email && <p className="text-[11px] text-error mt-1">{errors.email}</p>}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-on-surface-variant">Organization</label>
        <input
          {...field("organization")}
          type="text"
          maxLength={150}
          className={`mt-1 w-full rounded-md border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 ${errors.organization ? "border-error" : "border-outline-variant"}`}
          placeholder="City General Hospital"
        />
        {errors.organization && <p className="text-[11px] text-error mt-1">{errors.organization}</p>}
      </div>

      <div>
        <label className="text-xs font-semibold text-on-surface-variant">Tell us about your needs</label>
        <textarea
          {...field("message")}
          rows={3}
          maxLength={1000}
          className={`mt-1 w-full rounded-md border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 ${errors.message ? "border-error" : "border-outline-variant"}`}
          placeholder="What are you hoping to solve with Kairos?"
        />
        {errors.message && <p className="text-[11px] text-error mt-1">{errors.message}</p>}
      </div>

      {status === "error" && (
        <div className="rounded-md border border-error/40 bg-error/10 text-error text-xs px-3 py-2">
          Couldn't send your request. {errorMsg} Please try again or email us directly.
        </div>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full bg-primary text-on-primary py-3 rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 shadow-md shadow-primary/20"
      >
        {status === "submitting" ? "Sending…" : "Request Access"}
      </button>
    </form>
  );
}