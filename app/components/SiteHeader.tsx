"use client";

import { useEffect, useState, useCallback, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseAnon } from "@/lib/supabase-browser";
import type { Session } from "@supabase/supabase-js";

const links = [
  { href: "/check", label: "Check" },
  { href: "/history", label: "History" },
  { href: "/account", label: "My settings" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
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

  const handleNav = useCallback(
    (href: string, options?: { replace?: boolean }) =>
      (event: MouseEvent<HTMLAnchorElement>) => {
        if (event.defaultPrevented) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        event.preventDefault();
        try {
          if (options?.replace) {
            router.replace(href);
          } else {
            router.push(href);
          }
        } catch {
          window.location.href = href;
        }
      },
    [router]
  );

  const handleLogout = async () => {
    await supabaseAnon.auth.signOut();
    location.href = "/";
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a href="/" className="brand" onClick={handleNav("/", { replace: pathname === "/" })}>
          WakeStake
        </a>

        <nav className="topnav">
          {email && configured
            ? links.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className={pathname?.startsWith(link.href) ? "active" : ""}
                  onClick={handleNav(link.href)}
                >
                  {link.label}
                </a>
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
              <a className="btn" href="/signup" onClick={handleNav("/signup")}>
                Get started
              </a>
              <a className="btn link" href="/signin" onClick={handleNav("/signin")}>
                Sign in
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
