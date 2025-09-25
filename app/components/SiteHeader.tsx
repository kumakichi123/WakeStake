"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabaseAnon } from "@/lib/supabase-browser";

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

    const loadSession = async () => {
      const { data } = await supabaseAnon.auth.getSession();
      if (!active) return;
      const nextEmail = data.session?.user?.email ?? null;
      setEmail(nextEmail);
      setLoading(false);
      if (nextEmail) {
        try {
          const res = await fetch("/api/me/status");
          const body = await res.json().catch(() => ({}));
          if (!active) return;
          setConfigured(Boolean(body?.configured));
        } catch (error) {
          if (active) setConfigured(false);
        }
      } else {
        setConfigured(false);
      }
    };

    loadSession();

    const { data: listener } = supabaseAnon.auth.onAuthStateChange((_event, session) => {
      const nextEmail = session?.user?.email ?? null;
      setEmail(nextEmail);
      if (nextEmail) {
        fetch("/api/me/status")
          .then(res => res.json().catch(() => ({})))
          .then(body => {
            setConfigured(Boolean(body?.configured));
          })
          .catch(() => setConfigured(false));
      } else {
        setConfigured(false);
      }
    });

    return () => {
      active = false;
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
