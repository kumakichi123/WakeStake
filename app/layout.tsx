import "./globals.css";
import Providers from "./providers";
import SiteHeader from "./components/SiteHeader";

export const metadata = { title: "WakeStake" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>
        <Providers>
          <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
            <SiteHeader />
            <main style={{ flex: "1 1 auto" }}>{children}</main>
            <footer style={{ padding: "16px 12px", fontSize: 12, color: "#6B7280", textAlign: "center" }}>
              <nav style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <a href="/legal/terms">Terms</a>
                <span>·</span>
                <a href="/legal/privacy">Privacy</a>
                <span>·</span>
                <a href="/legal/tokushoho">Legal Notice</a>
              </nav>
              <div>&copy; {new Date().getFullYear()} WakeStake</div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
