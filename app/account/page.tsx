"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAnon } from "@/lib/supabase-browser";

type LatLng = { lat: number; lng: number };

const MapPicker = dynamic(() => import("../components/MapPicker"), { ssr: false });
const quickStakes = [1, 5, 10, 20, 50];

export default function AccountPage() {
  const router = useRouter();
  const [point, setPoint] = useState<LatLng | null>(null);
  const [address, setAddress] = useState("Loading...");
  const [wake, setWake] = useState("07:00");
  const [stake, setStake] = useState<number>(5);
  const [custom, setCustom] = useState("");
  const [tzid, setTzid] = useState("UTC");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [active, setActive] = useState(true);

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
        setTzid(body.tz || "UTC");
        setWake(body.wake_time || "07:00");
        if (typeof body.stake_usd === "number") {
          setStake(body.stake_usd);
          setCustom(String(body.stake_usd));
        }
        setActive(body.active_everyday ?? true);
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
    const value = Number(custom);
    if (Number.isFinite(value) && value > 0) setStake(value);
  }, [custom]);

  const selected = useMemo(() => `$${stake}`, [stake]);

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
      setActive(nextActive);
      setMessage(nextActive ? "WakeStake resumed." : "WakeStake paused.");
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
        <p style={{ color: "#6b7280" }}>Fine tune your wake-up commitment and home base. Updates apply from the next check-out window.</p>
      </header>

      <section style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginBottom: 24 }}>
        <div className="card" style={{ padding: 18 }}>
          <h2 style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Wake window</h2>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#1f2937" }}>{wake}</p>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Timezone: {tzid}</span>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <h2 style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Stake</h2>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#1f2937" }}>{selected}</p>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Only charged when you miss your deadline.</span>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <h2 style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Home base</h2>
          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{address || "Resolving location..."}</p>
          <span style={{ fontSize: 12, color: "#6b7280" }}>{point ? `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}` : ""}</span>
        </div>
      </section>

      <div className="card" style={{ padding: 20, marginBottom: 20, display: "grid", gap: 16 }}>
        <MapPicker
          value={point || undefined}
          onChange={(lat, lng) => setPoint({ lat, lng })}
          onAddress={value => setAddress(value || "")}
        />
        <small style={{ color: "#6b7280" }}>Drag the pin to update your morning departure radius.</small>
      </div>

      <section className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="settings-list">
          <div className="settings-row">
            <label>Wake time (local)</label>
            <input type="time" value={wake} onChange={event => setWake(event.target.value)} />
          </div>
          <div className="divider" />
          <div className="settings-row">
            <label>Wake stake (USD)</label>
            <div className="stake-options">
              <div className="stake-buttons">
                {quickStakes.map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setStake(value);
                      setCustom(String(value));
                    }}
                    className={`chip ${stake === value ? "active" : ""}`}
                  >
                    ${value}
                  </button>
                ))}
              </div>
              <div className="stake-input">
                <span>$</span>
                <input
                  placeholder="Custom"
                  value={custom}
                  onChange={event => setCustom(event.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="divider" />
          <div className="settings-row">
            <label>Timezone</label>
            <input value={tzid} onChange={event => setTzid(event.target.value)} />
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16, padding: 20, display: "grid", gap: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>WakeStake status</h2>
        <p style={{ color: "#6b7280", margin: 0 }}>
          {active
            ? "WakeStake is currently active. We'll expect a check-out every morning."
            : "WakeStake is paused. No reminders or charges will run until you resume."}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            className="btn link"
            type="button"
            onClick={() => toggleActive(false)}
            disabled={loading || !active}
          >
            Pause WakeStake
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => toggleActive(true)}
            disabled={loading || active}
          >
            Resume WakeStake
          </button>
        </div>
      </section>

      <div style={{ marginTop: 24, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn primary" style={{ minWidth: 160 }} onClick={handleSave} disabled={loading || initializing}>
          {loading ? "Saving..." : "Save changes"}
        </button>
        {message && <span style={{ fontSize: 12, color: message.includes("updated") || message.includes("resumed") ? "#0f766e" : "#b91c1c" }}>{message}</span>}
      </div>
    </main>
  );
}
