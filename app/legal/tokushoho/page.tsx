// app/legal/tokushoho/page.tsx
import { headers } from "next/headers";

export const metadata = { title: "Legal Disclosure / 特定商取引法に基づく表記 | WakeStake" };

const LEGAL = {
  operatorEn: "Yohei Asabe (Sole Proprietor)",
  operatorJa: "朝部 耀平（個人事業主）",
  addressEn: "Unit 201, 6-1-7, Kita 18-jo Nishi, Kita-ku, Sapporo, Hokkaido 001-0018, Japan",
  addressJa: "〒001-0018 北海道札幌市北区北18条西6-1-7-201",
  phonePublic: "", // 非公開運用。公開するなら "070-3619-7051"
  email: "support@ai-secretary.site",
  hoursEn: "09:00–15:00 JST, daily",
  hoursJa: "9:00–15:00（毎日）",
  site: "https://wake-stake.vercel.app/",
};

export default function Tokushoho() {
  const h = headers();
  const al = (h.get("accept-language") || "").toLowerCase();
  const preferJa = al.includes("ja");

  return (
    <main className="container" style={{ maxWidth: 860, padding: "40px 20px 80px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
        {preferJa ? "特定商取引法に基づく表記 / Legal Disclosure" : "Legal Disclosure / 特定商取引法に基づく表記"}
      </h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        {preferJa
          ? "本ページは日本の特定商取引法第11条に基づく表示です。海外ユーザー向けに英語表記も併記しています。"
          : "This page provides the disclosures required under Japan’s Specified Commercial Transactions Act. A Japanese version is included below."}
      </p>

      {/* ===== Preferred language block first ===== */}
      {preferJa ? <JaBlock /> : <EnBlock />}

      <hr style={{ margin: "32px 0" }} />

      {/* ===== The other language block (always rendered for compliance) ===== */}
      {preferJa ? <EnBlock secondary /> : <JaBlock secondary />}
    </main>
  );
}

function Row({ label, children }:{label:string; children:React.ReactNode}) {
  return (
    <section style={{ padding: 14 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{label}</h2>
      <div>{children}</div>
    </section>
  );
}

function EnBlock({ secondary=false }:{secondary?:boolean}) {
  return (
    <section aria-label="Legal (EN)" style={{ opacity: secondary ? 0.8 : 1 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>Legal Disclosure (Japan)</h2>
      <Row label="Seller / Operator">{LEGAL.operatorEn}</Row>
      <Row label="Address">{LEGAL.addressEn}</Row>
      <Row label="Phone">
        {LEGAL.phonePublic || "A phone number will be promptly disclosed upon request via email."}
      </Row>
      <Row label="Contact">{LEGAL.email} ({LEGAL.hoursEn})</Row>
      <Row label="Website">{LEGAL.site}</Row>
      <hr />
      <Row label="Product / Pricing">
        Service name: WakeStake. User sets a stake in USD (1–100 USD, in 1 USD increments). The stake is charged only on
        days the user misses check-in. Usage is aggregated and charged monthly.
      </Row>
      <Row label="Payment timing / Method">
        Credit/debit cards via Stripe. Metered usage is charged when the monthly invoice finalizes.
      </Row>
      <Row label="Delivery / Start of service">Immediately after successful checkout.</Row>
      <Row label="Cancellation / Pause">
        Pause anytime in the app via “Pause WakeStake”. After pausing, future missed check-ins are not counted.
      </Row>
      <Row label="Refunds">
        Digital service. Refunds are generally not provided after delivery. Erroneous charges will be corrected upon verification.
      </Row>
      <Row label="Additional fees">None. Network/data charges by the user.</Row>
      <Row label="Tax display">Specify inclusive/exclusive per your billing setup.</Row>
    </section>
  );
}

function JaBlock({ secondary=false }:{secondary?:boolean}) {
  return (
    <section aria-label="Legal (JA)" style={{ opacity: secondary ? 0.8 : 1 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>特定商取引法に基づく表記</h2>
      <Row label="販売事業者">{LEGAL.operatorJa}</Row>
      <Row label="所在地">{LEGAL.addressJa}</Row>
      <Row label="電話番号">
        {LEGAL.phonePublic || "※電話番号はご請求いただいた場合、遅滞なく開示します。"}
      </Row>
      <Row label="お問い合わせ先">
        {LEGAL.email}（{LEGAL.hoursJa}）
      </Row>
      <Row label="ウェブサイト">{LEGAL.site}</Row>
      <hr />
      <Row label="販売価格">
        サービス名「WakeStake」。ユーザーが1〜100 USD（1 USD単位）を設定し、起床チェックイン失敗日のみ計上。月次で一括請求。
      </Row>
      <Row label="支払時期・方法">クレジット/デビット（Stripe）。月次請求書確定時に決済。</Row>
      <Row label="提供時期">チェックアウト完了後、直ちに利用可能。</Row>
      <Row label="解約・停止">アプリの「Pause WakeStake」で随時停止可。停止後は以降の失敗は計上されません。</Row>
      <Row label="返品・返金">デジタル役務のため原則不可。誤課金は個別に対応します。</Row>
      <Row label="追加費用">なし（通信料は利用者負担）。</Row>
      <Row label="税込/税抜の表示">課金設定に合わせて記載。</Row>
    </section>
  );
}
