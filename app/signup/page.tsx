"use client";
import { supabaseAnon } from "@/lib/supabase-browser";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const router = useRouter();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!agree) {
      alert("Please agree to the Terms of Service and Privacy Notice first.");
      return;
    }
    const { error } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/check` },
    });
    if (error) {
      alert(error.message);
      return;
    }
    try {
      await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "signup_agree" }),
      });
    } catch {}
    router.replace("/check");
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>Create account</h1>
      <form onSubmit={onSubmit} className="card" style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="Email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}
        />
        <label style={{ fontSize: 12, color: "#444", display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={agree} onChange={event => setAgree(event.target.checked)} />
          <span>
            I agree to the <a href="/legal/terms" style={{ textDecoration: "underline" }}>Terms of Service</a> and
            <a href="/legal/privacy" style={{ textDecoration: "underline", marginLeft: 4 }}>Privacy Notice</a>.
          </span>
        </label>
        <button className="btn" type="submit">
          Create account
        </button>
      </form>
      <p style={{ fontSize: 12, color: "#666", marginTop: 10 }}>
        Already have an account? <a href="/signin" style={{ textDecoration: "underline" }}>Sign in</a>
      </p>
    </div>
  );
}
