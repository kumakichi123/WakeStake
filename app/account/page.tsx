"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAnon } from "@/lib/supabase-browser";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

type LatLng = { lat: number; lng: number };

const MapPicker = dynamic(() => import("../components/MapPicker"), { ssr: false });
const stakeOptions = [1, 5, 10, 20, "custom"] as const;
type StakeOption = (typeof stakeOptions)[number];

const MAJOR_TIMEZONES: string[] = [
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Singapore",
  "Australia/Sydney",
];

export default function AccountPage() {
  const router = useRouter();
  const [point, setPoint] = useState<LatLng | null>(null);
  const [address, setAddress] = useState("Loading...");
  const [wake, setWake] = useState("07:00");
  const [stake, setStake] = useState<number>(5);
  const [stakeOption, setStakeOption] = useState<StakeOption>(5);
  const [custom, setCustom] = useState("");
  const [stakeNotice, setStakeNotice] = useState<string | null>(null);
  const [tzid, setTzid] = useState<string>("UTC");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [activeEffectiveDate, setActiveEffectiveDate] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabaseAnon.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          if (!active) return;
          const next = encodeURIComponent(window.location.pathname);
          router.replace(`/signin?next=${next}`);
          return;
        }
        const res = await fetch("/api/me/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!active) return;
        if (res.status === 401) {
          const next = encodeURIComponent(window.location.pathname);
          router.replace(`/signin?next=${next}`);
          return;
        }
        if (res.ok && !body?.configured) {
          router.replace("/onboarding");
        }
      } catch (error) {
        console.debug("[status-check]", error);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabaseAnon.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          const next = encodeURIComponent(window.location.pathname);
          router.replace(`/signin?next=${next}`);
          return;
        }
        const res = await fetch("/api/me/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessage(body?.error || "Failed to load settings");
          return;
        }
        if (cancelled) return;
        if (typeof body.home_lat === "number" && typeof body.home_lng === "number") {
          setPoint({ lat: body.home_lat, lng: body.home_lng });
        }
        setTzid(typeof body.tz === "string" && body.tz ? body.tz : "UTC");
        setWake(body.wake_time || "07:00");
        if (typeof body.stake_usd === "number") {
          const sanitized = Math.max(1, Math.min(100, Math.round(body.stake_usd)));
          setStake(sanitized);
          setCustom(String(sanitized));
          setStakeNotice(body.stake_usd > 100 ? "Max stake is $100. Reset to $100." : null);
          setStakeOption(
            stakeOptions.includes(sanitized as StakeOption) ? (sanitized as StakeOption) : "custom"
          );
        } else {
          setStake(5);
          setStakeOption(5);
          setCustom("5");
          setStakeNotice(null);
        }
        setActive(body.active_everyday ?? true);
        setActiveEffectiveDate(typeof body.active_effective_local_date === "string" ? body.active_effective_local_date : null);
        setMessage(null);
      } catch (error: any) {
        if (!cancelled) setMessage(error?.message || "Failed to load settings");
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const { data: listener } = supabaseAnon.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        const next = encodeURIComponent(window.location.pathname);
        router.replace(`/signin?next=${next}`);
      }
    });
    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (stakeOption === "custom") return;
    setStake(stakeOption);
    setCustom(String(stakeOption));
  }, [stakeOption]);

  useEffect(() => {
    if (stakeOption !== "custom") return;
    const value = Number(custom);
    if (Number.isFinite(value) && value > 0) setStake(value);
  }, [custom, stakeOption]);

  const timezoneOptions = useMemo(() => {
    const list = [...MAJOR_TIMEZONES]; // string[]
    if (tzid && !list.includes(tzid)) {
      list.unshift(tzid);
    }
    return list;
  }, [tzid]);

  const selected = useMemo(() => `$${stake}`, [stake]);

  const todayLocal = dayjs().tz(tzid).format("YYYY-MM-DD");
  const pendingResume = Boolean(active && activeEffectiveDate && todayLocal < activeEffectiveDate);
  const statusDescription = !active
    ? "WakeStake is paused. No reminders or charges will run until you resume."
    : pendingResume
    ? `WakeStake resumes on ${dayjs.tz(activeEffectiveDate!, tzid).format("MMM D")}. No reminders or charges until then.`
    : "WakeStake is currently active. We'll expect a check-out every morning.";

  const handleSave = async () => {
    if (!point) {
      setMessage("Location has not been resolved yet.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { data } = await supabaseAnon.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again.");
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tz: tzid,
          home: { lat: point.lat, lng: point.lng },
          wake_time: wake,
          stake_usd: stake,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "Could not update settings");
      }
      setMessage("Settings updated");
    } catch (error: any) {
      setMessage(error?.message || "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (nextActive: boolean) => {
    setLoading(true);
    setMessage(null);
    try {
      const { data } = await supabaseAnon.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again.");
      const res = await fetch("/api/me/pause", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active: nextActive }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "Failed to update schedule");
      }
      const nextEffective = typeof body.activeEffectiveLocalDate === "string" ? body.activeEffectiveLocalDate : null;
      setActive(nextActive);
      setActiveEffectiveDate(nextActive ? nextEffective : null);
      if (nextActive) {
        const todayLocal = dayjs().tz(tzid).format("YYYY-MM-DD");
        if (nextEffective && todayLocal < nextEffective) {
          const resumeDisplay = dayjs.tz(nextEffective, tzid).format("MMM D");
          setMessage(`WakeStake resumes on ${resumeDisplay}.`);
        } else {
          setMessage("WakeStake resumed.");
        }
      } else {
        setMessage("WakeStake paused.");
      }
    } catch (error: any) {
      setMessage(error?.message || "Failed to update schedule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ maxWidth: 960, padding: "40px 20px 80px" }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: "#1F1B2D", marginBottom: 6 }}>My settings</h1>
        <p style={{ color: "#6b7280" }}>
          Fine tune your wake-up commitment and home base. Updates apply from the next check-out window.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          marginBottom: 24,
        }}
      >
        <div className="card" style={{ padding: 18 }}>
          <h2
            style={{
              fontSize: 12,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 6,
            }}
          >
            Wake window
          </h2>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#1f2937" }}>{wake}</p>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Timezone: {tzid}</span>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <h2
            style={{
              fontSize: 12,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 6,
            }}
          >
            Stake
          </h2>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#1f2937" }}>{selected}</p>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Only charged when you miss your deadline.</span>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <h2
            style={{
              fontSize: 12,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 6,
            }}
          >
            Home base
          </h2>
          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
            {address || "Resolving location..."}
          </p>
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            {point ? `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}` : ""}
          </span>
        </div>
      </section>

      <div className="card" style={{ padding: 20, marginBottom: 20, display: "grid", gap: 16 }}>
        <MapPicker
          value={point || undefined}
          onChange={(lat, lng) => setPoint({ lat, lng })}
          onAddress={(value) => setAddress(value || "")}
        />
        <small style={{ color: "#6b7280" }}>Drag the pin to update your morning departure radius.</small>
      </div>

      <section className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="settings-list">
          <div className="settings-row">
            <label>Wake time (local)</label>
            <input type="time" value={wake} onChange={(event) => setWake(event.target.value)} />
          </div>
          <div className="divider" />
          <div className="settings-row">
            <label>Wake stake (USD)</label>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={stakeOption === "custom" ? "custom" : String(stakeOption)}
                onChange={(event) => {
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
                style={{ padding: 10, border: "1px solid #e9d5ff", borderRadius: 10, minWidth: 160 }}
              >
                {stakeOptions.map((option) => (
                  <option key={option} value={option === "custom" ? "custom" : option}>
                    {option === "custom" ? "Custom amount" : `$${option}`}
                  </option>
                ))}
              </select>
              {stakeOption === "custom" && (
                <div className="stake-input">
                  <span>$</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="Custom"
                    value={custom}
                    onChange={(event) => setCustom(event.target.value)}
                  />
                </div>
              )}
              {stakeNotice && <small style={{ display: "block", color: "#b91c1c" }}>{stakeNotice}</small>}
            </div>
          </div>
          <div className="divider" />
          <div className="settings-row">
            <label>Timezone</label>
            <select value={tzid} onChange={(event) => setTzid(event.target.value)}>
              {timezoneOptions.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16, padding: 20, display: "grid", gap: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>WakeStake status</h2>
        <p style={{ color: "#6b7280", margin: 0 }}>{statusDescription}</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn link" type="button" onClick={() => toggleActive(false)} disabled={loading || !active}>
            Pause WakeStake
          </button>
          <button className="btn" type="button" onClick={() => toggleActive(true)} disabled={loading || active}>
            Resume WakeStake
          </button>
        </div>
      </section>

      <div style={{ marginTop: 24, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          className="btn primary"
          style={{ minWidth: 160 }}
          onClick={handleSave}
          disabled={loading || initializing}
        >
          {loading ? "Saving..." : "Save changes"}
        </button>
        {message && (
          <span
            style={{
              fontSize: 12,
              color: message.includes("updated") || message.includes("resumed") ? "#0f766e" : "#b91c1c",
            }}
          >
            {message}
          </span>
        )}
      </div>
    </main>
  );
}

