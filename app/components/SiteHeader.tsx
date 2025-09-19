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

  useEffect(() => {
    supabaseAnon.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
      setLoading(false);
    });

    const { data: listener } = supabaseAnon.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
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
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname?.startsWith(link.href) ? "active" : ""}
            >
              {link.label}
            </Link>
          ))}
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
              <Link className="btn link" href="/signin">
                Sign in
              </Link>
              <Link className="btn" href="/signup">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

