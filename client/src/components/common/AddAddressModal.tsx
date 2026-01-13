"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IoClose } from "react-icons/io5";
import { toast } from "sonner";
import { buildUrl as build } from "@/lib/api";

export type AddressPayload = {
  label: "Home" | "Work" | "Other";
  line1: string;
  line2: string;
  city: string;
  state: string;   // STATE CODE (e.g. "GJ")
  pincode: string; // 6-digit string
};

type Mode = "add" | "edit";

type StateOpt = { code: string; name: string; type: "State" | "UT" };

export default function AddAddressModal({
  open,
  onClose,
  onSaved,
  mode = "add",
  initial,
  endpoint = "/api/users/addresses",
  fallbackPatchMe = true,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (address: AddressPayload, prevKey?: string) => void;
  mode?: Mode;
  initial?: AddressPayload | null;
  endpoint?: string;
  fallbackPatchMe?: boolean;
}) {
  const [saving, setSaving] = useState(false);

  const [label, setLabel] = useState<AddressPayload["label"]>("Home");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [pincode, setPincode] = useState("");

  // geo
  const [states, setStates] = useState<StateOpt[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  const prevKey = useMemo(() => makeAddrKey(initial || undefined), [initial]);

  // Reset / prefill when opens
  useEffect(() => {
    if (open) {
      setLabel(initial?.label ?? "Home");
      setLine1(initial?.line1 ?? "");
      setLine2(initial?.line2 ?? "");
      setCity(initial?.city ?? "");
      setStateVal(initial?.state ?? "");
      setPincode(initial?.pincode ?? "");
    }
  }, [open, initial]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Click-outside to close
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current && panelRef.current.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Load states
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const r = await fetch(build("/api/geo/states"), { cache: "no-store" });
        if (r.ok) {
          const list = (await r.json()) as StateOpt[];
          setStates(list);
        } else {
          setStates([]);
        }
      } catch {
        setStates([]);
      }
    })();
  }, [open]);

  // Load cities when state changes
  useEffect(() => {
    setCities([]);
    if (!open || !stateVal) return;
    (async () => {
      try {
        setLoadingCities(true);
        const r = await fetch(build(`/api/geo/cities?state=${encodeURIComponent(stateVal)}`), {
          cache: "no-store",
        });
        if (r.ok) {
          const data = await r.json();
          const arr = Array.isArray(data?.cities) ? data.cities : [];
          setCities(arr);
          if (city && !arr.includes(city)) setCity("");
        } else {
          setCities([]);
        }
      } catch {
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateVal, open]);

  const payload: AddressPayload = {
    label,
    line1: line1.trim(),
    line2: line2.trim(),
    city: city.trim(),
    state: stateVal.trim(), // store STATE CODE from API
    pincode: pincode.trim(),
  };

  const valid = () =>
    payload.line1 &&
    payload.line2 &&
    payload.city &&
    payload.state &&
    /^\d{6}$/.test(payload.pincode);

  const save = async () => {
    if (!valid()) {
      toast.warning("Please fill all address fields correctly.");
      return;
    }

    setSaving(true);
    try {
      const method = mode === "edit" ? "PUT" : "POST";
      const { getAuthHeader } = await import("@/lib/token");
      const authHeaders = getAuthHeader();
      const res = await fetch(build(endpoint), {
        method,
        credentials: "include",
        headers: { 
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify({ address: payload, prevKey }),
      });

      if (res.ok) {
        toast.success(mode === "edit" ? "Address updated." : "Address added.");
        onSaved?.(payload, prevKey);
        onClose();
        return;
      }

      if (fallbackPatchMe && res.status === 404) {
        const patchBody =
          mode === "edit"
            ? { updateAddress: { prevKey, address: payload } }
            : { pushAddress: payload };
        const { getAuthHeader } = await import("@/lib/token");
        const headers: Record<string, string> = { 
          "Content-Type": "application/json",
          ...getAuthHeader()
        };
        const pr = await fetch(build("/api/users/me"), {
          method: "PATCH",
          headers,
          body: JSON.stringify(patchBody),
        });
        if (pr.ok) {
          toast.success(mode === "edit" ? "Address updated." : "Address added.");
          onSaved?.(payload, prevKey);
          onClose();
          return;
        }
      }

      const txt = await res.text().catch(() => "");
      throw new Error(txt || "Could not save address.");
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong while saving address.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div aria-hidden={!open} className={`fixed inset-0 z-[80] ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      {/* Overlay */}
      <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />

      {/* Panel */}
      <div className="absolute inset-0 grid place-items-center px-4">
        <div
          ref={panelRef}
          className={`w-full max-w-lg rounded-2xl bg-white ring-1 ring-black/10 shadow-xl transition-all duration-300 ${
            open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label={mode === "edit" ? "Edit address" : "Add new address"}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <h3 className="text-lg font-semibold">
                {mode === "edit" ? "Edit address" : "Add new address"}
              </h3>
              <p className="text-xs text-neutral-500">All fields are required.</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-black/5"
            >
              <IoClose size={18} />
            </button>
          </div>

          <div className="px-5 pt-4 pb-5">
            {/* Label chips */}
            <div className="mb-4">
              <span className="text-sm font-medium">Address type</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["Home", "Work", "Other"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setLabel(opt)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition ${
                      label === opt
                        ? "bg-[var(--wnr-berry)] text-white border-[var(--wnr-berry)]"
                        : "border-neutral-300 hover:bg-neutral-50"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Address line 1 *</label>
                <input
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--wnr-berry)]"
                  placeholder="House no., Street name"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Address line 2 *</label>
                <input
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--wnr-berry)]"
                  placeholder="Apartment, landmark"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">State *</label>
                  <select
                    value={stateVal}
                    onChange={(e) => {
                      setStateVal(e.target.value);
                      setCity("");
                    }}
                    className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--wnr-berry)] bg-white"
                  >
                    <option value="">Select State / UT</option>
                    {states.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name} {s.type === "UT" ? "(UT)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">City *</label>
                  {cities.length > 0 ? (
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={!stateVal || loadingCities}
                      className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--wnr-berry)] bg-white disabled:bg-gray-100"
                    >
                      <option value="">{loadingCities ? "Loading…" : "Select City"}</option>
                      {cities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={!stateVal ? "Select state first" : "City"}
                      className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--wnr-berry)]"
                      disabled={!stateVal}
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Pincode *</label>
                <input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--wnr-berry)]"
                  placeholder="6-digit code"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-neutral-50">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-[var(--wnr-berry)] text-white hover:opacity-90 disabled:opacity-60"
              >
                {saving ? (mode === "edit" ? "Updating…" : "Saving…") : mode === "edit" ? "Update address" : "Save address"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------- key helpers for dedupe --------------------- */
export function makeAddrKey(a?: Partial<AddressPayload>) {
  const n = (s?: string) => (s ?? "").trim().toLowerCase();
  if (!a) return "";
  return [n(a.label), n(a.line1), n(a.line2), n(a.city), n(a.state), n(a.pincode)].join("|");
}
