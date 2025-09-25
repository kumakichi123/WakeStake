"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabaseAnon } from "@/lib/supabase-browser";
import type { Session } from "@supabase/supabase-js";

const links = [
  { href: "/check", label: "Check" },
  { href: "/history", label: "History" },
  { href: "/account", label: "My settings" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const applySession = async (session: Session | null) => {
      if (!active) return;

      const nextEmail = session?.user?.email ?? null;
      setEmail(nextEmail);
      setLoading(false);

      if (!nextEmail) {
        setConfigured(false);
        return;
      }

      const token = session?.access_token ?? null;
      if (!token) {
        setConfigured(false);
        return;
      }

      try {
        const res = await fetch("/api/me/status", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const body = await res.json().catch(() => ({}));
        if (!active) return;
        setConfigured(res.ok && Boolean(body?.configured));
      } catch {
        if (active) setConfigured(false);
      }
    };

    supabaseAnon.auth
      .getSession()
      .then(({ data }) => applySession(data.session))
      .catch(() => {
        if (active) {
          setEmail(null);
          setConfigured(false);
          setLoading(false);
        }
      });

    const { data: listener } = supabaseAnon.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      active = false;
      controller.abort();
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabaseAnon.auth.signOut();
    location.href = "/";
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          WakeStake
        </Link>

        <nav className="topnav">
          {email && configured
            ? links.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={pathname?.startsWith(link.href) ? "active" : ""}
                >
                  {link.label}
                </Link>
              ))
            : null}
        </nav>

        <div className="top-actions">
          {!loading && email ? (
            <>
              <span className="user-email">{email}</span>
              <button type="button" className="btn link" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link className="btn" href="/signup">
                Get started
              </Link>
              <Link className="btn link" href="/signin">
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
