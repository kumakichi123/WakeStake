import "./globals.css";
import Providers from "./providers";
import SiteHeader from "./components/SiteHeader";
import Script from "next/script";

export const metadata = { title: "WakeStake" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

  return (
    <html lang="en">
      <head>
        {/* gtag.js 本体 */}
        <Script
          id="gtag-src"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        {/* dataLayer 初期化と config */}
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            const id = '${GA_ID}';
            if (id) {
              gtag('js', new Date());
              gtag('config', id, { send_page_view: true });
            }
          `}
        </Script>
      </head>
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
