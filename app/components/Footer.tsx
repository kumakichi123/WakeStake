import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ padding: "16px 12px", fontSize: 12, color: "#666" }}>
      <nav style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/legal/terms">Terms</Link>
        <span>·</span>
        <Link href="/legal/privacy">Privacy Notice</Link>
        <span>·</span>
        <Link href="/legal/tokushoho">Legal Notice</Link>
      </nav>
      <p style={{ textAlign: "center", marginTop: 8 }}>&copy; {new Date().getFullYear()} WakeStake</p>
    </footer>
  );
}
