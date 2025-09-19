"use client";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { supabaseAnon } from "@/lib/supabase-browser";

const MapPicker = dynamic(() => import("../components/MapPicker"), { ssr: false });

type LatLng = { lat: number; lng: number };
const stakeOptions = [1, 5, 10, 20, "custom"] as const;
type StakeOption = (typeof stakeOptions)[number];
const MAJOR_TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Singapore",
  "Australia/Sydney"
] as const;

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ok = searchParams.get("ok");

  const [point, setPoint] = useState<LatLng | null>(null);
  const [address, setAddress] = useState("Resolving location...");
  const [wake, setWake] = useState("07:00");
  const [stake, setStake] = useState<number>(5);
  const [stakeOption, setStakeOption] = useState<StakeOption>(5);
  const [custom, setCustom] = useState("");
  const [stakeNotice, setStakeNotice] = useState<string | null>(null);
  const [tzid, setTzid] = useState("UTC");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ok === "1") {
      router.replace("/check");
    }
  }, [ok, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabaseAnon.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      try {
        const res = await fetch("/api/me/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && body?.configured) {
          router.replace("/check");
        }
      } catch (err) {
        console.debug("[status]", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    setTzid(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  useEffect(() => {
    if (stakeOption === "custom") return;
    setStake(stakeOption);
    setCustom(String(stakeOption));
    setStakeNotice(null);
  }, [stakeOption]);

  useEffect(() => {
    if (stakeOption !== "custom") return;
    if (custom === "") {
      setStakeNotice(null);
      return;
    }
    const value = Number(custom);
    if (!Number.isFinite(value)) return;
    const clamped = Math.max(1, Math.min(100, Math.round(value)));
    setStake(clamped);
    if (value > 100) {
      if (custom !== "100") {
        setCustom("100");
      }
      setStakeNotice("Max stake is $100. Reset to $100.");
      return;
    }
    setStakeNotice(null);
    const normalized = String(clamped);
    if (normalized !== custom) {
      setCustom(normalized);
    }
  }, [custom, stakeOption]);

  const timezoneOptions = useMemo(() => {
    const list = [...MAJOR_TIMEZONES] as string[];
    if (!list.includes(tzid)) {
      list.unshift(tzid);
    }
    return list;
  }, [tzid]);

  const selected = useMemo(() => `$${stake}`, [stake]);

  const handleCommit = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      if (!point) {
        throw new Error("Location has not been resolved yet.");
      }
      if (!Number.isFinite(stake) || stake <= 0) {
        throw new Error("Please choose a positive stake amount.");
      }
      const { data } = await supabaseAnon.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        throw new Error("Session not found. Please sign in again.");
      }

      const payload = {
        tz: tzid,
        home: { lat: point.lat, lng: point.lng },
        wake_time: wake,
        stake_usd: stake,
      };

      const setupRes = await fetch("/api/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const setupBody = await setupRes.json().catch(() => ({}));
      if (!setupRes.ok || !setupBody?.ok) {
        throw new Error(setupBody?.error || "Failed to save your wake settings.");
      }

      const checkoutRes = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const checkoutBody = await checkoutRes.json().catch(() => ({}));
      if (!checkoutRes.ok) {
        throw new Error(checkoutBody?.error || "Could not create a Stripe Checkout session.");
      }
      const url = checkoutBody?.url;
      if (typeof url !== "string" || url.length === 0) {
        throw new Error("Stripe provided an invalid redirect URL.");
      }
      window.location.href = url;
    } catch (err) {
      console.error("[commit:error]", err);
      setError(err instanceof Error ? err.message : "Unexpected error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ maxWidth: 920, padding: "40px 20px 80px" }}>
      <h1 style={{ textAlign: "center", fontSize: 28, fontWeight: 800, color: "#6D28D9", marginBottom: 16 }}>
        Slide to commit
      </h1>

      <section className="card" style={{ marginTop: 12, padding: 12 }}>
        <MapPicker
          value={point || undefined}
          onChange={(lat, lng) => setPoint({ lat, lng })}
          onAddress={value => setAddress(value || "")}
        />
      </section>

      <section className="card" style={{ marginTop: 12, padding: "8px 12px" }}>
        <label style={{ fontSize: 12, color: "#6b7280" }}>Address</label>
        <input
          value={address}
          onChange={event => setAddress(event.target.value)}
          style={{ width: "100%", padding: 12, border: "1px solid #e9d5ff", borderRadius: 10 }}
        />
      </section>

      <section className="card field">
        <label>Wake time</label>
        <input type="time" value={wake} onChange={event => setWake(event.target.value)} />
      </section>

      <section className="card field">
        <label>Wake stake (USD)</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={stakeOption === "custom" ? "custom" : String(stakeOption)}
            onChange={event => {
              const value = event.target.value;
              if (value === "custom") {
                setStakeOption("custom");
                setStakeNotice(null);
                return;
              }
              const amount = Number(value);
              setStakeOption(amount as StakeOption);
              setStake(amount);
              setCustom(String(amount));
              setStakeNotice(null);
            }}
            style={{ padding: 10, border: "1px solid #e9d5ff", borderRadius: 10, minWidth: 140 }}
          >
            {stakeOptions.map(option => (
              <option key={option} value={option === "custom" ? "custom" : option}>
                {option === "custom" ? "Custom amount" : `$${option}`}
              </option>
            ))}
          </select>
          {stakeOption === "custom" && (
            <input
              type="number"
              min={1}
              step={1}
              placeholder="Enter amount"
              value={custom}
              onChange={event => setCustom(event.target.value)}
              style={{ padding: 10, border: "1px solid #e9d5ff", borderRadius: 10, width: 140 }}
            />
          )}
          <span style={{ marginLeft: 8, fontWeight: 700 }}>Selected: {selected}</span>
          {stakeNotice && (
            <small style={{ display: "block", color: "#b91c1c", marginTop: 4 }}>
              {stakeNotice}
            </small>
          )}
        </div>
      </section>

      <section className="card field">
        <label>Timezone</label>
        <select
          value={tzid}
          onChange={event => setTzid(event.target.value)}
          style={{ padding: 10, border: "1px solid #e9d5ff", borderRadius: 10, width: "100%" }}
        >
          {timezoneOptions.map(zone => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </section>

      <div style={{ marginTop: 18 }}>
        <button
          className="btn primary"
          onPointerDown={event => event.preventDefault()}
          onClick={handleCommit}
          disabled={loading}
          style={{ width: "100%" }}
        >
          {loading ? "Connecting to Stripe..." : "Slide to commit"}
        </button>
        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
          By continuing you agree to be charged only if you miss your daily deadline.
        </p>
        {error && (
          <p style={{ fontSize: 12, color: "#dc2626", marginTop: 8 }}>{error}</p>
        )}
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <main className="container" style={{ maxWidth: 920, padding: "40px 20px 80px" }}>
          <h1 style={{ textAlign: "center", fontSize: 28, fontWeight: 800, color: "#6D28D9", marginBottom: 16 }}>
            Slide to commit
          </h1>
          <p style={{ textAlign: "center", color: "#6b7280" }}>Loading onboarding...</p>
        </main>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
























