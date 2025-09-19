"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAnon } from "@/lib/supabase-browser";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

type Position = { lat: number; lng: number; accuracy: number };
type Popup = {
  tone: "success" | "warning" | "error";
  title: string;
  message: string;
};

dayjs.extend(utc);
dayjs.extend(timezone);

const KNOB_WIDTH = 56;

export default function CheckPage() {
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLButtonElement | null>(null);
  const progressRef = useRef(0);

  const [trackWidth, setTrackWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [locOK, setLocOK] = useState(false);
  const [coords, setCoords] = useState<Position | null>(null);
  const [msg, setMsg] = useState("Ready when you are.");
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<Popup | null>(null);
  const [windowInfo, setWindowInfo] = useState<{ wake: string; grace: number; tz: string } | null>(null);

  useEffect(() => {
    let active = true;
    const redirectIfNeeded = async () => {
      const { data } = await supabaseAnon.auth.getSession();
      if (!active) return;
      if (!data.session) {
        const next = encodeURIComponent(window.location.pathname);
        router.replace(`/signin?next=${next}`);
      }
    };
    redirectIfNeeded();
    const { data: listener } = supabaseAnon.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        const next = encodeURIComponent(window.location.pathname);
        router.replace(`/signin?next=${next}`);
      }
    });
    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    const updateWidth = () => {
      if (trackRef.current) {
        setTrackWidth(trackRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    const poll = () =>
      navigator.geolocation.getCurrentPosition(
        position => {
          setLocOK(true);
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        () => setLocOK(false),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabaseAnon.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      try {
        const res = await fetch("/api/me/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!active || !res.ok) return;
        setWindowInfo({
          wake: body.wake_time || "07:00",
          grace: body.grace_min ?? 60,
          tz: body.tz || "UTC",
        });
      } catch (error) {
        console.debug("[window-info]", error);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (event: PointerEvent) => updateProgress(event.clientX);
    const handleEnd = (event: PointerEvent) => {
      knobRef.current?.releasePointerCapture(event.pointerId);
      setDragging(false);
      const pct = progressRef.current;
      if (pct >= 0.95 && locOK && !loading) {
        setProgress(1);
        void doCheck();
      } else {
        setProgress(0);
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);
    };
  }, [dragging, locOK, loading]);

  const updateProgress = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const usable = Math.max(rect.width - KNOB_WIDTH, 1);
    const offset = Math.min(Math.max(clientX - rect.left - KNOB_WIDTH / 2, 0), usable);
    setProgress(offset / usable);
  };

  const prompt = useMemo(() => {
    if (loading) return "Checking your location...";
    if (!locOK) return "Waiting for location access";
    if (progress >= 0.95) return "Release to confirm";
    return "Slide to check out";
  }, [loading, locOK, progress]);

  const windowRange = useMemo(() => {
    if (!windowInfo) return null;
    const { wake, grace, tz } = windowInfo;
    const [hour, minute] = wake.split(":").map(Number);
    const end = dayjs().tz(tz).hour(hour).minute(minute).second(0).millisecond(0);
    const start = end.clone().subtract(grace, "minute");
    return `${start.format("HH:mm")} – ${end.format("HH:mm")} (${tz})`;
  }, [windowInfo]);

  async function doCheck() {
    if (loading) return;
    setLoading(true);
    setMsg("Checking location...");

    const { data } = await supabaseAnon.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      const message = "Please sign in again to record your check-out.";
      setMsg(message);
      setPopup({ tone: "error", title: "Session expired", message });
      setLoading(false);
      setProgress(0);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async position => {
        const payload = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        try {
          const res = await fetch("/api/checkin", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });
          const body = await res.json().catch(() => ({}));
          if (res.ok && body?.ok) {
            const successMessage = "You made it out before your deadline. Keep the streak going!";
            setMsg(successMessage);
            setPopup({ tone: "success", title: "Great job!", message: successMessage });
          } else {
            const apiMessage = body?.message || "We couldn't verify your check-out.";
            setMsg(apiMessage);
            const windowLine = windowRange ? `\nYour check-out window is ${windowRange}.` : "";
            if (body?.error === "too_early") {
              setPopup({
                tone: "warning",
                title: "Window not open yet",
                message: `${apiMessage}${windowLine}`,
              });
            } else if (body?.error === "too_late") {
              setPopup({
                tone: "warning",
                title: "Deadline passed",
                message: `${apiMessage}${windowLine}`,
              });
            } else if (body?.error === "not_outside") {
              setPopup({ tone: "warning", title: "Almost there", message: apiMessage });
            } else {
              setPopup({ tone: "error", title: "Check-in failed", message: apiMessage });
            }
          }
        } catch (error: any) {
          const message = error?.message || "Network error";
          setMsg(message);
          setPopup({ tone: "error", title: "Check-in failed", message });
        } finally {
          setLoading(false);
          setProgress(0);
        }
      },
      error => {
        const message = error.message || "Location error";
        setMsg(message);
        setPopup({ tone: "error", title: "Location error", message });
        setLoading(false);
        setProgress(0);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  const knobPosition = Math.min(progress, 1) * Math.max(trackWidth - KNOB_WIDTH, 0);

  return (
    <div className="container" style={{ maxWidth: 520, padding: "48px 20px 88px" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1F1B2D", marginBottom: 8 }}>Daily Check-out</h1>
        <p style={{ color: "#666" }}>Step outside and slide to confirm before your deadline.</p>
      </header>

      <section className="card" style={{ padding: 20, display: "grid", gap: 16 }}>
        <div>
          <p style={{ marginBottom: 4, color: "#6b7280", fontSize: 12 }}>Step</p>
          <ol style={{ margin: 0, paddingLeft: 18, color: "#1f2937" }}>
            <li>Wait for location access to turn ready.</li>
            <li>Walk beyond your home radius.</li>
            <li>Slide and release to confirm.</li>
          </ol>
        </div>

        <div className="slide-track" ref={trackRef} data-disabled={!locOK || loading}>
          <div className="slide-progress" style={{ width: `${Math.max(progress * 100, 0)}%` }} />
          <span className="slide-label">{prompt}</span>
          <button
            ref={knobRef}
            type="button"
            className="slide-knob"
            style={{ transform: `translateX(${knobPosition}px)` }}
            aria-label="Slide to check out"
            aria-disabled={!locOK || loading}
            onPointerDown={event => {
              if (!locOK || loading) return;
              knobRef.current?.setPointerCapture(event.pointerId);
              setDragging(true);
              updateProgress(event.clientX);
            }}
            onKeyDown={event => {
              if (!locOK || loading) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setProgress(1);
                void doCheck();
              }
            }}
          >
            >
          </button>
        </div>

        <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#6b7280" }}>
          <div>
            Status: <strong style={{ color: locOK ? "#0f766e" : "#b91c1c" }}>{locOK ? "Location ready" : "Waiting for GPS"}</strong>
          </div>
          {coords && (
            <div style={{ textAlign: "right" }}>
              <div>Accuracy: {Math.round(coords.accuracy)} m</div>
            </div>
          )}
        </footer>
      </section>

      <p style={{ marginTop: 20, color: "#6b7280" }}>{msg}</p>

      {windowRange && (
        <p style={{ marginTop: 6, color: "#9ca3af", fontSize: 12 }}>
          Today’s window: {windowRange}
        </p>
      )}

      {popup && (
        <div className="popup-overlay" role="alertdialog" aria-modal="true">
          <div className={`popup-card ${popup.tone}`}>
            <h3>{popup.title}</h3>
            <p>{popup.message}</p>
            <button type="button" className="btn" onClick={() => setPopup(null)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
