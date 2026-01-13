// src/app/contact/page.tsx
"use client";

import { useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  IoMailOutline,
  IoCallOutline,
  IoLocationOutline,
  IoLogoWhatsapp,
  IoCafeOutline,
  IoFlaskOutline,
  IoGiftOutline,
  IoPeopleOutline,
  IoChatbubblesOutline,
  IoLeafOutline,
  IoBriefcaseOutline,
} from "react-icons/io5";

import { buildUrl as build } from "@/lib/api";

/* =========================================================
   Wild n’ Root — Contact Page
   Updated: Ahmedabad office + socials (Instagram, LinkedIn, Facebook)
   ========================================================= */

type ReasonOption =
  | "Orders"
  | "Product question"
  | "Gifting / Corporate"
  | "Collabs / Events"
  | "B2B"
  | "Feedback";

type ContactApiOk = { ok: true; id: string; status: "stored" };
type ContactApiErr = { ok: false; error: string; fields?: Record<string, string> };

const CONTACT = {
  emails: {
    info: "info@wildnroot.com", // info & sales
    care: "care@wildnroot.com", // customer care
  },
  phones: {
    sales: "+919825550708",
    care: "+919824440330",
  },
  address: {
    line:
      "GF-28, Manas Complex, Near Jodhpur Cross Roads, Satellite, Ahmedabad - 380015. Gujarat, India.",
    // DMS 23°01'32\"N 72°31'30\"E -> decimal:
    lat: 23.025556,
    lng: 72.525,
    label: "Wild n’ Root — Manas Complex Office",
  },
};

const getSubjectFor = (r: ReasonOption) => {
  switch (r) {
    case "Orders":
      return "Order - status / change";
    case "Product question":
      return "Help picking the right brew";
    case "Gifting / Corporate":
      return "Bulk gifting — quantities & note card";
    case "Collabs / Events":
      return "Collab / pop-up idea";
    case "B2B":
      return "B2B inquiry — wholesale / partnership";
    default:
      return "Product Feedback / Website feedback";
  }
};

export default function ContactPage() {
  const [sending, setSending] = useState(false);
  const [reason, setReason] = useState<ReasonOption>("Orders");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [mapActive, setMapActive] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const MAX = 1000;

  const subjectPlaceholder = useMemo(() => getSubjectFor(reason), [reason]);
  const toggleInterest = (tag: string) =>
    setInterests((p) => (p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]));

  const handleReasonSelect = (r: ReasonOption) => {
    setReason(r);
    setSubject(getSubjectFor(r));
    document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current) return;

    const fd = new FormData(formRef.current);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const phone = String(fd.get("phone") || "").trim() || null;
    const msg = String(fd.get("message") || "").trim();

    if (!name || !email || !msg) {
      toast.error("Please fill the required fields.");
      return;
    }

    try {
      setSending(true);
      const res = await fetch(build("/api/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          subject: subject || subjectPlaceholder,
          message: msg,
          reason,
          interests,
          meta: {
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
            referer: typeof document !== "undefined" ? document.referrer : undefined,
          },
        }),
      });

      const data = (await res.json()) as ContactApiOk | ContactApiErr;
      if (!res.ok || (data as any).ok === false) {
        const errMsg =
          (data as ContactApiErr).error ||
          (res.status === 429
            ? "Too many requests. Please try again later."
            : "Something went wrong. Please try again.");
        throw new Error(errMsg);
      }

      toast.success("Message sent! We’ll reply soon.");
      formRef.current.reset();
      setMessage("");
      setSubject("");
      setInterests([]);
      setReason("Orders");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send. Try again later.");
    } finally {
      setSending(false);
    }
  };

  const whatsappHref = `https://wa.me/${CONTACT.phones.sales.replace(/\D/g, "")}`;
  const emailInfoHref = `mailto:${CONTACT.emails.info}`;
  const telSalesHref = `tel:${CONTACT.phones.sales}`;
  const telCareHref = `tel:${CONTACT.phones.care}`;
  const mapsEmbedSrc = `https://www.google.com/maps?q=${CONTACT.address.lat},${CONTACT.address.lng}&z=16&output=embed`;
  const mapsDirections = `https://www.google.com/maps/dir/?api=1&destination=${CONTACT.address.lat},${CONTACT.address.lng}`;

  return (
    <main className="bg-[var(--wnr-cream)] text-[var(--wnr-text)]">
      {/* 1) HERO */}
      <section className="relative overflow-hidden mt-[calc(5rem+var(--offer-strip-height,0px))] pt-24 md:pt-28 pb-14 md:pb-16">
        {/* foam + berry gradient */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(1200px 420px at 50% -10%, rgba(255,255,255,0.9), rgba(255,255,255,0) 60%), linear-gradient(180deg, var(--wnr-berry) 0%, #4e1f3e 60%, #2a1b2b 100%)",
          }}
        />
        {/* subtle grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
            backgroundSize: "28px 28px, 28px 28px",
            backgroundPosition: "-14px -14px",
          }}
        />

        <div className="wnr-container relative z-10 text-white text-center">
          <h1 className="font-semibold tracking-tight text-[36px] md:text-5xl lg:text-6xl">
         We’d Love to Hear From You
          </h1>
          <p className="mt-4 text-[15px] md:text-lg text-white/90">
            Questions about our brews, orders, gifting, B2B or collabs?
          </p>

          {/* Quick actions */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <QuickAction href={whatsappHref} label="WhatsApp (Sales)" icon={<IoLogoWhatsapp />} />
            <QuickAction href={emailInfoHref} label="Email (Info & Sales)" icon={<IoMailOutline />} />
            <QuickAction href={telSalesHref} label="Call (Sales)" icon={<IoCallOutline />} />
          </div>

          {/* Reason chips */}
          <ReasonChips value={reason} onChange={handleReasonSelect} className="mt-6" />

          <div className="mt-6 text-xs md:text-sm text-white/75 flex items-center justify-center gap-6">
            <span>⏱ Avg. response: 1–2 business days</span>
            <span>🕘 Mon–Fri • 9:30–18:00 IST</span>
          </div>
        </div>
      </section>

      {/* 2) CARDS */}
      <section className="-mt-10 md:-mt-12 pb-4 md:pb-6">
        <div className="wnr-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <BrewCard
            icon={<IoCafeOutline size={22} />}
            title="Orders & Shipping"
            copy="Order status, address changes, shipping or returns."
            link={{ href: "#contact-form", label: "Ask now" }}
          />
          <BrewCard
            icon={<IoFlaskOutline size={22} />}
            title="Product Advice"
            copy="Not sure which brew fits? We can help you choose."
            link={{ href: "#contact-form", label: "Get guidance" }}
          />
          <BrewCard
            icon={<IoGiftOutline size={22} />}
            title="Gifting / Corporate"
            copy="Bulk gift boxes with custom notes. Simple & fast."
            link={{ href: "#contact-form", label: "Get a quote" }}
          />
          
        </div>
      </section>

      {/* 3) FORM */}
      <section id="contact-form" className="pb-16 md:pb-24">
        <div className="wnr-container grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
          {/* Left: About + interest chips */}
          <div className="rounded-2xl bg-white ring-1 ring-black/5 shadow-soft p-5 md:p-7">
            <h3 className="text-xl md:text-2xl font-semibold mb-3">Brew with us</h3>
            <p className="text-neutral-700 text-sm md:text-base">
              Tell us what you’re after — flavor, function or mood. We’ll help
              match you to the right brew (or mix a sampler of our five).
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {"Power Brew, Digestive Brew, Calm, Focus, Seasonal"
                .split(", ")
                .map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => toggleInterest(t)}
                    className={`h-9 px-3 rounded-full text-sm ring-1 transition ${
                      interests.includes(t)
                        ? "bg-[var(--wnr-berry)] text-white ring-transparent"
                        : "bg-white text-[var(--wnr-text)] ring-black/10 hover:bg-black/5"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <IoLeafOutline /> {t}
                    </span>
                  </button>
                ))}
            </div>

            <ul className="mt-6 space-y-2 text-sm text-neutral-700">
              <li>• Small-batch blends • Compostable packs</li>
              <li>• Simple steeping guide included</li>
              <li>• Gift notes available at checkout</li>
            </ul>
          </div>

          {/* Right: Form */}
          <div className="rounded-2xl bg-white ring-1 ring-black/5 shadow-soft p-5 md:p-6 lg:p-7">
            <h3 className="text-xl md:text-2xl font-semibold">Send us a message</h3>

            <form ref={formRef} onSubmit={onSubmit} className="mt-6 space-y-5">
              <input type="hidden" name="reason" value={reason} />
              <input type="hidden" name="interests" value={interests.join(", ")} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Name *">
                  <input
                    name="name"
                    required
                    placeholder=" "
                    className={inputCls}
                    autoComplete="name"
                  />
                </Field>
                <Field label="Email *">
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder=" "
                    className={inputCls}
                    autoComplete="email"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Phone">
                  <input
                    name="phone"
                    type="tel"
                    placeholder=" "
                    className={inputCls}
                    autoComplete="tel"
                  />
                </Field>
                <Field label="Subject">
                  <input
                    name="subject"
                    placeholder={subjectPlaceholder}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field
                label="Message *"
                extra={
                  <span
                    className={`text-xs ${
                      message.length > MAX ? "text-red-600" : "text-neutral-500"
                    }`}
                  >
                    {message.length}/{MAX}
                  </span>
                }
              >
                <textarea
                  name="message"
                  required
                  rows={6}
                  placeholder=" "
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX + 1))}
                  className={`${inputCls} resize-y min-h-[140px] md:min-h-[160px]`}
                />
              </Field>

              <label className="flex items-start gap-3 text-sm text-neutral-700">
                <input type="checkbox" className="mt-1.5 h-4 w-4 rounded border-black/30" required />
                I agree that Wild n' Root can contact me back about my inquiry.
              </label>

              <div className="pt-1 flex gap-3 flex-wrap">
                <button
                  type="submit"
                  disabled={sending}
                  className="h-11 px-6 rounded-full text-white bg-[var(--wnr-berry)] hover:opacity-90 disabled:opacity-60 transition inline-flex items-center gap-2"
                >
                  {sending ? <Spinner /> : null}
                  {sending ? "Sending…" : "Send message"}
                </button>
                <a
                  href={`mailto:${CONTACT.emails.care}`}
                  className="h-11 px-6 rounded-full ring-1 ring-black/10 bg-white hover:bg-black/5 transition inline-flex items-center justify-center"
                >
                  Email customer care
                </a>
                <a
                  href={telCareHref}
                  className="h-11 px-6 rounded-full ring-1 ring-black/10 bg-white hover:bg-black/5 transition inline-flex items-center justify-center"
                >
                  Call customer care
                </a>
              </div>

              <p className="text-xs text-neutral-500">
                We’ll store your message securely and reach back via email/phone.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* 4) STUDIO & SUPPORT */}
      <section id="studio" className="pb-20">
        <div className="wnr-container grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
          {/* Hours & address */}
          <div className="lg:col-span-2 rounded-2xl bg-white ring-1 ring-black/5 shadow-soft p-5 md:p-6">
            <h4 className="text-lg font-semibold">Studio & Support</h4>
            <p className="text-sm text-neutral-700 mt-1">
              {CONTACT.address.line}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-neutral-500">Mon–Fri</dt>
              <dd>10:00 – 18:00</dd>
              <dt className="text-neutral-500">Sat</dt>
              <dd>10:00 – 16:00</dd>
              <dt className="text-neutral-500">Sun</dt>
              <dd>Closed</dd>
            </dl>

            <div className="mt-4 space-y-2 text-sm">
              <div>
                <span className="text-neutral-500">Info & Sales: </span>
                <a href={emailInfoHref} className="text-[var(--wnr-berry)] hover:opacity-90">
                  {CONTACT.emails.info}
                </a>{" "}
                • <a href={telSalesHref} className="text-[var(--wnr-berry)] hover:opacity-90">
                  {CONTACT.phones.sales}
                </a>
              </div>
              <div>
                <span className="text-neutral-500">Customer Care: </span>
                <a href={`mailto:${CONTACT.emails.care}`} className="text-[var(--wnr-berry)] hover:opacity-90">
                  {CONTACT.emails.care}
                </a>{" "}
                • <a href={telCareHref} className="text-[var(--wnr-berry)] hover:opacity-90">
                  {CONTACT.phones.care}
                </a>
              </div>
            </div>

            <p className="mt-3 text-xs text-neutral-500">
              Note: We don’t operate a public café/retail outlet.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={mapsDirections}
                target="_blank"
                rel="noreferrer"
                className="h-10 px-4 rounded-full bg-[var(--wnr-berry)] text-white inline-flex items-center gap-2 hover:opacity-90"
              >
                <IoLocationOutline /> Directions
              </a>
              <a
                href={telSalesHref}
                className="h-10 px-4 rounded-full ring-1 ring-black/10 bg-white inline-flex items-center gap-2 hover:bg-black/5"
              >
                <IoCallOutline /> Call sales
              </a>
              <a
                href={telCareHref}
                className="h-10 px-4 rounded-full ring-1 ring-black/10 bg-white inline-flex items-center gap-2 hover:bg-black/5"
              >
                <IoCallOutline /> Call care
              </a>
            </div>

            {/* NEW social icons (Instagram, LinkedIn, Facebook) */}
            <div className="mt-5 flex items-center gap-3">
              <SocialLink href="https://www.instagram.com/wildnroot/" label="Instagram">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.2-1.2a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z" />
                </svg>
              </SocialLink>
              <SocialLink href="http://linkedin.com/company/wild-n-root/" label="LinkedIn">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.5 8h4V24h-4V8zm7.5 0h3.8v2.2h.1c.5-.9 1.7-2.2 4-2.2 4.2 0 5 2.8 5 6.3V24h-4v-7.6c0-1.8 0-4.1-2.5-4.1-2.5 0-2.9 2-2.9 4V24h-4V8z" />
                </svg>
              </SocialLink>
              <SocialLink href="https://www.facebook.com/people/Wild-N-Root/61577858951456/" label="Facebook">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M13.5 22v-8h2.6l.4-3h-3v-2c0-.9.3-1.5 1.6-1.5H17V4.2c-.8-.1-1.7-.2-2.5-.2C12 4 10.5 5.3 10.5 8v3H8v3h2.5v8h3z" />
                </svg>
              </SocialLink>
            </div>
          </div>

          {/* Optional map (click-to-enable interactions) */}
          <div className="lg:col-span-3 relative rounded-2xl overflow-hidden ring-1 ring-black/5 shadow-soft">
            {!mapActive && (
             <button
  onClick={() => setMapActive(true)}
  className="absolute inset-0 z-10 bg-[var(--wnr-berry)]/20 backdrop-blur-sm text-white flex items-center justify-center"
  aria-label="Enable map interactions"
>
  <span className="inline-flex items-center justify-center h-12 px-6 rounded-full bg-white/95 text-[var(--wnr-berry)] font-semibold hover:bg-white transition shadow-sm text-center">
    Click to enable map
  </span>
</button>

            )}
            <div className="relative w-full" style={{ paddingTop: "58%" }}>
              <iframe
                title={CONTACT.address.label}
                className="absolute inset-0 w-full h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={mapsEmbedSrc}
                style={{ pointerEvents: mapActive ? ("auto" as const) : ("none" as const) }}
              />
            </div>
            <div className="sr-only" aria-hidden>
              Lat: {CONTACT.address.lat}, Lng: {CONTACT.address.lng}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/* —————————— Pieces —————————— */

function ReasonChips({
  value,
  onChange,
  className,
}: {
  value: ReasonOption;
  onChange: (v: ReasonOption) => void;
  className?: string;
}) {
  const opts: { key: ReasonOption; label: string; icon: React.ReactNode }[] = [
    { key: "Orders", label: "Orders", icon: <IoCafeOutline /> },
    { key: "Product question", label: "Product question", icon: <IoFlaskOutline /> },
    { key: "Gifting / Corporate", label: "Gifting / Corporate", icon: <IoGiftOutline /> },
    { key: "B2B", label: "B2B", icon: <IoBriefcaseOutline /> },
    { key: "Collabs / Events", label: "Collabs / Events", icon: <IoPeopleOutline /> },
    { key: "Feedback", label: "Feedback", icon: <IoChatbubblesOutline /> },
  ];
  return (
    <div className={"flex flex-wrap items-center justify-center gap-2 " + (className || "")}>
      {opts.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={`h-10 px-4 rounded-full text-sm font-medium inline-flex items-center gap-2 transition ring-1 
              ${active ? "bg-white text-[var(--wnr-berry)] ring-transparent" : "bg-white/10 text-white ring-white/20 hover:bg-white/15"}`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function BrewCard({
  icon,
  title,
  copy,
  link,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  link: { href: string; label: string };
}) {
  return (
    <div className="relative rounded-2xl bg-white p-5 md:p-6 shadow-soft ring-1 ring-black/5">
      <div className="flex items-start gap-4">
        <div className="grid place-items-center h-11 w-11 rounded-xl bg-[var(--wnr-berry)] text-white">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-lg line-clamp-1">{title}</h3>
          <p className="text-sm text-neutral-700 mt-1">{copy}</p>
          <a
            href={link.href}
            className="mt-3 inline-flex items-center gap-2 text-[var(--wnr-berry)] hover:opacity-90"
          >
            {link.label} →
          </a>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="h-11 px-5 rounded-full bg-white/10 ring-1 ring-white/20 hover:bg-white/15 transition inline-flex items-center gap-2"
    >
      {icon}
      <span className="font-medium">{label}</span>
    </a>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noreferrer"
      className="text-[var(--wnr-berry)] hover:opacity-90 inline-flex items-center justify-center h-9 w-9 rounded-full ring-1 ring-black/10 bg-white"
      title={label}
    >
      {children}
      <span className="sr-only">{label}</span>
    </a>
  );
}

const inputCls =
  "peer mt-1 w-full rounded-xl px-4 py-2.5 ring-1 ring-black/10 bg-white outline-none focus:ring-[var(--wnr-berry)]/40 placeholder-transparent";

function Field({
  label,
  extra,
  children,
}: {
  label: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {extra}
      </div>
      {children}
    </label>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 rounded-full border border-white/60 border-t-transparent animate-spin" />
  );
}
