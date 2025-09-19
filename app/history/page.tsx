"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAnon } from "@/lib/supabase-browser";

type Row = { local_date: string; status: "success" | "violation" };
type Streak = { current: number; longest: number };

export default function History() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState<Streak>({ current: 0, longest: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabaseAnon.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        const next = encodeURIComponent(window.location.pathname);
        router.replace(`/signin?next=${next}`);
        return;
      }
      try {
        const res = await fetch("/api/history");
        const body = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (!res.ok) throw new Error(body?.error || "Failed to load history");
        setRows(body.rows || []);
        setTotal(body.total_usd || 0);
        setStreak(body.streak || { current: 0, longest: 0 });
      } catch (error) {
        console.error("[history]", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const { data: listener } = supabaseAnon.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        const next = encodeURIComponent(window.location.pathname);
        router.replace(`/signin?next=${next}`);
      }
    });
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [router]);

  return (
    <main className="container" style={{ maxWidth: 780, padding: "40px 20px 80px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1F1B2D", marginBottom: 6 }}>Progress history</h1>
      <p style={{ color: "#6b7280", marginBottom: 28 }}>
        Keep an eye on your streaks and gentle nudges.
      </p>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 24 }}>
        <div className="card" style={{ padding: 16 }}>
          <h2 style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.6 }}>Current streak</h2>
          <p style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{streak.current} days</p>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <h2 style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.6 }}>Longest streak</h2>
          <p style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{streak.longest} days</p>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <h2 style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.6 }}>Good morning fund</h2>
          <p style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>${total}</p>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Total gently redirected stakes</span>
        </div>
      </section>

      <section className="card" style={{ padding: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Daily log</h2>
        {loading ? (
          <p style={{ color: "#6b7280" }}>Fetching your recent mornings...</p>
        ) : rows.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No check-ins yet. Your first entry will appear here.</p>
        ) : (
          <ul style={{ display: "grid", gap: 8 }}>
            {rows.map((row, index) => (
              <li
                key={`${row.local_date}-${index}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(139,92,246,0.05)",
                }}
              >
                <span style={{ fontWeight: 600 }}>{row.local_date}</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: row.status === "success" ? "#15803d" : "#dc2626",
                  }}
                >
                  {row.status === "success" ? "Outside on time" : "Missed cut-off"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
