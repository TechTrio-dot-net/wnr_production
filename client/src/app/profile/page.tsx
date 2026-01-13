// src/app/profile/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildUrl as build } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import {
  IoPersonOutline,
  IoMailOutline,
  IoCallOutline,
  IoLocationOutline,
  IoCreateOutline,
  IoTrashOutline,
} from "react-icons/io5";
import { toast } from "sonner";
import AddAddressModal, { AddressPayload } from "@/components/common/AddAddressModal";

/* ---------------- LocalStorage helpers ---------------- */
const LS_ADDR_KEY = "wnr:addresses";
const LS_ADDR_TOMBSTONES_KEY = "wnr:addresses:tombstones";

type Address = {
  label?: "Home" | "Work" | "Other";
  line1?: string;
  line2?: string;
  city?: string;
  state?: string; // STATE CODE (e.g., "JK")
  pincode?: string;
};

function normStr(s?: unknown) {
  if (s == null) return "";
  return String(s).trim().toLowerCase();
}

// ✅ Always treat missing label as "home" for the dedupe key
function addrKey(a?: Address | AddressPayload) {
  if (!a) return "";
  const labelKey = normStr((a.label as string) || "home");
  return [
    labelKey,
    normStr(a.line1),
    normStr(a.line2),
    normStr(a.city),
    normStr(a.state),
    normStr(a.pincode),
  ].join("|");
}

// ✅ Normalize first; then dedupe
function dedupeAddresses(list: (Address | AddressPayload)[]): Address[] {
  const seen = new Set<string>();
  const out: Address[] = [];
  for (const raw of list) {
    const a: Address = {
      label: (raw.label as any) || "Home",
      line1: raw.line1 ?? "",
      line2: raw.line2 ?? "",
      city: raw.city ?? "",
      state: raw.state ?? "",
      pincode: raw.pincode ?? "",
    };
    const k = addrKey(a);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}

function loadLocalAddresses(): Address[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_ADDR_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? dedupeAddresses(arr as Address[]) : [];
  } catch {
    return [];
  }
}
function saveLocalAddresses(addrs: Address[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_ADDR_KEY, JSON.stringify(dedupeAddresses(addrs)));
  } catch {}
}

// ---- Tombstones to persist deletions across refreshes (local-only guard) ----
function loadTombstones(): Set<string> {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = localStorage.getItem(LS_ADDR_TOMBSTONES_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? (arr as string[]) : []);
  } catch {
    return new Set<string>();
  }
}
function saveTombstones(st: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_ADDR_TOMBSTONES_KEY, JSON.stringify([...st]));
  } catch {}
}
/* ----------------------------------------------------- */

type UserMe = {
  _id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  addresses?: Address[];
};

type StateOpt = { code: string; name: string; type: "State" | "UT" };

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserMe | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Default address editor (first address)
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [pincode, setPincode] = useState("");

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editInitial, setEditInitial] = useState<AddressPayload | null>(null);

  // Geo data from API
  const [states, setStates] = useState<StateOpt[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Load states once
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(build("/api/geo/states"), { cache: "no-store" });
        if (r.ok) {
          const list = (await r.json()) as StateOpt[];
          setStates(list);
        } else setStates([]);
      } catch {
        setStates([]);
      }
    })();
  }, []);

  // Load cities when state changes
  useEffect(() => {
    setCities([]);
    if (!stateVal) return;
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
  }, [stateVal]);

  // Load user + merge local addresses -> sync back any locals missing in DB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ok = await isLoggedIn();
        if (!ok) {
          router.replace(`/login?returnTo=${encodeURIComponent("/profile")}`);
          return;
        }

        const res = await fetchWithAuth(build("/api/users/me"), { cache: "no-store" });
        if (!res.ok) {
          setLoading(false);
          return;
        }

        const me: UserMe = await res.json().catch(() => null);
        if (!me || cancelled) {
          setLoading(false);
          return;
        }

        setUser(me);
        setName((me.name ?? "").trim());
        setEmail((me.email ?? "").trim());
        setPhone((me.phone ?? "").replace(/^\+91/, ""));

        const tombstones = loadTombstones();

        // MERGE server + local (normalize + dedupe) and drop tombstoned ones
        const serverAddrs = (me.addresses || []).filter((a) => !tombstones.has(addrKey(a)));
        const localAddrs = loadLocalAddresses().filter((a) => !tombstones.has(addrKey(a)));
        const merged = dedupeAddresses([...serverAddrs, ...localAddrs]);
        setAddresses(merged);
        saveLocalAddresses(merged);

        // Prefill default editor
        const addr = merged[0];
        if (addr) {
          setLine1(addr.line1 ?? "");
          setLine2(addr.line2 ?? "");
          setCity(addr.city ?? "");
          setStateVal(addr.state ?? "");
          setPincode(addr.pincode ?? "");
        }

        // SYNC locals-only to backend (skip tombstoned)
        const serverKeys = new Set(serverAddrs.map(addrKey));
        const localsOnly = merged.filter((a) => !serverKeys.has(addrKey(a)));
        if (localsOnly.length) {
          for (const a of localsOnly) {
            try {
              const r = await fetchWithAuth(build("/api/users/addresses"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address: a }),
              });
              if (!r.ok && r.status === 404) {
                await fetchWithAuth(build("/api/users/me"), {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ pushAddress: a }),
                });
              }
            } catch {}
          }
          const rr = await fetchWithAuth(build("/api/users/me"), { cache: "no-store" });
          if (rr.ok) {
            const canon = await rr.json();
            const final = dedupeAddresses(
              [...(canon?.addresses || []), ...loadLocalAddresses()].filter((a) => !tombstones.has(addrKey(a)))
            );
            setAddresses(final);
            saveLocalAddresses(final);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const saveProfile = async () => {
    const nameClean = name.trim();
    const emailClean = email.trim();
    const line1Clean = line1.trim();
    const line2Clean = line2.trim();
    const cityClean = city.trim();
    const stateClean = stateVal.trim(); // CODE
    const pin = pincode.trim();

    if (!nameClean || !emailClean || !phone || !line1Clean || !line2Clean || !cityClean || !stateClean || !pin) {
      toast.warning("Please fill all required fields before saving.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      toast.error("Please enter a valid 6-digit pincode.");
      return;
    }

    const payload = {
      name: nameClean,
      email: emailClean,
      address: { line1: line1Clean, line2: line2Clean, city: cityClean, state: stateClean, pincode: pin },
    };

    setSaving(true);
    try {
      const res = await fetchWithAuth(build("/api/users/me"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed. Please try again.");

      // Update local first address to match saved default (ensure label explicitly present)
      const updated = dedupeAddresses([
        { label: addresses[0]?.label || "Home", ...payload.address },
        ...addresses.slice(1),
      ]);
      setAddresses(updated);
      saveLocalAddresses(updated);

      toast.success("Profile updated successfully!");
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  };

  /* -------------------- Address actions -------------------- */
  const handleAddressSaved = async (a: AddressPayload, prevKey?: string) => {
    // Optimistic merge
    let next = addresses.slice();
    if (prevKey) {
      // edited
      const idx = next.findIndex((x) => addrKey(x) === prevKey);
      if (idx >= 0) next[idx] = a;
      else next = dedupeAddresses([a, ...next]);
    } else {
      // added
      next = dedupeAddresses([a, ...next]);
    }
    // Drop if it was previously tombstoned
    const tombstones = loadTombstones();
    tombstones.delete(addrKey(a));
    saveTombstones(tombstones);

    setAddresses(next);
    saveLocalAddresses(next);

    // Refresh canonical from backend in background
    try {
      const r = await fetchWithAuth(build("/api/users/me"), { cache: "no-store" });
      if (r.ok) {
        const me = await r.json();
        const final = dedupeAddresses([...(me?.addresses || []), ...loadLocalAddresses()]).filter(
          (x) => !tombstones.has(addrKey(x))
        );
        setAddresses(final);
        saveLocalAddresses(final);
      }
    } catch {}
  };

  const deleteAddress = async (a: Address) => {
    const key = addrKey(a);

    // Optimistic remove + tombstone
    const reduced = addresses.filter((x) => addrKey(x) !== key);
    setAddresses(reduced);
    saveLocalAddresses(reduced);
    const tombstones = loadTombstones();
    tombstones.add(key);
    saveTombstones(tombstones);

    try {
      // Primary delete endpoint
      const res = await fetchWithAuth(build("/api/users/addresses"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (res.ok) {
        toast.success("Address deleted.");
      } else if (res.status === 404) {
        // Fallback Patch
        const pr = await fetchWithAuth(build("/api/users/me"), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ removeAddress: key }),
        });
        if (pr.ok) toast.success("Address deleted.");
        else toast.error("Could not delete address.");
      } else {
        toast.error("Could not delete address.");
      }
    } catch {
      toast.error("Could not delete address.");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-neutral-500">Loading profile…</div>;
  }

  return (
    <main className="max-w-5xl mx-auto px-4 md:px-6 py-10 mt-24">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Your Profile</h1>
      <p className="text-sm text-black/60 mt-1">All fields are required. Make sure your details are up to date.</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ---- Personal Info ---- */}
        <section className="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--wnr-berry)]/10">
              <IoPersonOutline className="text-[var(--wnr-berry)]" />
            </span>
            <h2 className="text-lg md:text-xl font-semibold">Personal Info</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full name *</label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--wnr-berry)]">
                <IoPersonOutline className="text-black/50" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent outline-none text-[15px]"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Email *</label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--wnr-berry)]">
                <IoMailOutline className="text-black/50" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent outline-none text-[15px]"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Phone *</label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border bg-neutral-50 px-3 py-2">
                <IoCallOutline className="text-black/50" />
                <input
                  value={phone}
                  disabled
                  readOnly
                  className="w-full bg-transparent text-[15px] text-neutral-500 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-black/50 mt-1">This is your verified sign-in number and can’t be changed.</p>
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="w-full md:w-auto rounded-lg bg-[var(--wnr-berry)] px-4 py-2 text-white font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--wnr-berry)] transition"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </section>

        {/* ---- Address Section + Add Button ---- */}
        <section className="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--wnr-berry)]/10">
                <IoLocationOutline className="text-[var(--wnr-berry)]" />
              </span>
              <h2 className="text-lg md:text-xl font-semibold">Addresses</h2>
            </div>

            <button
              onClick={() => setAddOpen(true)}
              className="rounded-lg px-3 py-2 text-sm bg-[var(--wnr-berry)] text-white hover:opacity-90"
            >
              + Add new address
            </button>
          </div>

          {/* Default address editor (first address fields) */}
          <div className="space-y-4">
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

          <p className="text-xs text-black/50 mt-3">Tip: Fill all fields and save to update your default address.</p>

          {/* Saved addresses list (Edit/Delete) */}
          <div className="mt-6">
            {addresses.length === 0 ? (
              <p className="text-sm text-neutral-600">No addresses yet. Add your first one.</p>
            ) : (
              <ul className="space-y-3">
                {addresses.map((a, idx) => {
                  const aFull: AddressPayload = {
                    label: (a.label as any) || "Home",
                    line1: a.line1 || "",
                    line2: a.line2 || "",
                    city: a.city || "",
                    state: a.state || "",
                    pincode: a.pincode || "",
                  };
                  return (
                    <li key={`${addrKey(a)}-${idx}`} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {a.label && (
                              <span className="inline-flex text-xs px-2 py-1 rounded-full bg-neutral-100 border">
                                {a.label}
                              </span>
                            )}
                            <span className="text-xs text-neutral-500">#{idx + 1}</span>
                          </div>
                          <div className="text-sm">
                            <div>{a.line1}</div>
                            <div>{a.line2}</div>
                            <div>
                              {a.city}, {a.state} – {a.pincode}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-neutral-50 text-sm"
                            onClick={() => {
                              setEditInitial(aFull);
                              setEditOpen(true);
                            }}
                          >
                            <IoCreateOutline /> Edit
                          </button>
                          <button
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-red-50 text-red-600 text-sm"
                            onClick={() => deleteAddress(a)}
                          >
                            <IoTrashOutline /> Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Add Address Modal */}
      <AddAddressModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={handleAddressSaved}
        mode="add"
      />

      {/* Edit Address Modal */}
      <AddAddressModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(addr, prevKey) => {
          handleAddressSaved(addr, prevKey);
          setEditOpen(false);
        }}
        mode="edit"
        initial={editInitial || undefined}
      />
    </main>
  );
}
