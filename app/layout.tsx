// app/layout.tsx
import "./globals.css";
import Providers from "./providers";
import Script from "next/script";
import SiteHeader from "./components/SiteHeader"; // ← 上に通常 import

export const metadata = { title: "WakeStake" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

  return (
    <html lang="en">
      <head>
        {GA_ID && (
          <>
            <Script id="gtag-src" src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="gtag-init" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { send_page_view: true });
            `}</Script>
          </>
        )}
      </head>
      <body>
        <Providers>
          <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
            <SiteHeader /> {/* ← @ts-expect-error を外す */}
            <main style={{ flex: "1 1 auto" }}>{children}</main>
            <footer style={{ padding: "16px 12px", fontSize: 12, color: "#6B7280", textAlign: "center" }}>
              <nav style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <a href="/legal/terms">Terms</a><span>·</span>
                <a href="/legal/privacy">Privacy</a><span>·</span>
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
