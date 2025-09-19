export default function LegalNotice() {
  return (
    <main className="container" style={{ maxWidth: 860, padding: "40px 20px 80px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>Legal Notice</h1>
      <p style={{ color: "#6b7280", marginBottom: 28 }}>
        WakeStake is operated by Yohei Asabe as a sole proprietorship. This notice summarizes the key business details for
        customers.
      </p>

      <section style={{ display: "grid", gap: 20 }}>
        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Operator</h2>
          <p>
            Yohei Asabe (sole proprietor)<br />
            Based in Sapporo, Hokkaido, Japan<br />
            Mailing address available on request
          </p>
          <p>
            Contact: <a href="mailto:support@ai-secretary.site">support@ai-secretary.site</a><br />
            Stripe Merchant ID available upon request.
          </p>
        </article>

        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Business Activity</h2>
          <p>
            WakeStake offers a motivational wake-up accountability service. Users set personal commitments and agree to pay
            a voluntary stake when they miss their chosen deadline. The service is subscription-based with metered usage billing.
          </p>
        </article>

        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Dispute Resolution</h2>
          <p>
            We aim to resolve concerns promptly. Please contact <a href="mailto:support@ai-secretary.site">support@ai-secretary.site</a> for billing or service questions.
            If we cannot resolve a dispute amicably, the Terms of Service describe governing law and venue.
          </p>
        </article>

        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Regulatory Compliance</h2>
          <p>
            WakeStake complies with applicable U.S. consumer protection laws and processes payments through Stripe, a PCI-DSS
            compliant provider. If local regulations apply to your jurisdiction, you are responsible for ensuring the service
            is permitted before use.
          </p>
        </article>
      </section>
    </main>
  );
}
