export default function Terms() {
  return (
    <main className="container" style={{ maxWidth: 860, padding: "40px 20px 80px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>Terms of Service</h1>
      <p style={{ color: "#6b7280", marginBottom: 28 }}>
        These Terms of Service ("Terms") govern your use of WakeStake. By creating an account or using the
        service, you agree to these Terms.
      </p>

      <section style={{ display: "grid", gap: 20 }}>
        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Operator</h2>
          <p>
            WakeStake is operated by Yohei Asabe (sole proprietor). The business is based in Sapporo, Japan. A full
            mailing address can be provided upon request. Contact: <a href="mailto:support@ai-secretary.site">support@ai-secretary.site</a>.
          </p>
        </article>

        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>1. Service Overview</h2>
          <p>
            WakeStake lets you set a daily wake deadline, confirm that you have left your home radius, and pay a
            voluntary stake only when you miss that commitment. We use Supabase for authentication and data storage,
            Stripe for billing, and third-party geolocation services for location checks.
          </p>
        </article>

        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>2. Account & Eligibility</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>You must be at least 18 years old and able to form a binding contract.</li>
            <li>You are responsible for maintaining the confidentiality of your credentials.</li>
            <li>We may suspend or terminate access if we detect misuse or violation of these Terms.</li>
          </ul>
        </article>

        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>3. Commitments & Charges</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>You choose your daily stake (between $1 and $100 USD) and wake time.</li>
            <li>If you fail to confirm that you are outside your saved home radius within the grace period, the stake is recorded as due.</li>
            <li>Charges are aggregated through Stripe on a metered subscription. We do not issue refunds for valid missed commitments.</li>
          </ul>
        </article>

        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>4. Location Data</h2>
          <p>
            The service relies on precise location data to verify compliance. You are responsible for ensuring your
            device shares accurate coordinates. Poor GPS accuracy or disabled permissions may result in missed
            commitments.
          </p>
        </article>

        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>5. Disclaimers</h2>
          <p>
            WakeStake is provided on an "as-is" and "as-available" basis. We do not guarantee that the service will be
            error-free, uninterrupted, or that location data will always be captured correctly. To the fullest extent
            permitted by law, WakeStake disclaims all warranties and liability arising from the use of the service.
          </p>
        </article>

        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>6. Limitation of Liability</h2>
          <p>
            Our aggregate liability to you for any claim related to the service will not exceed the total stakes you paid in the
            three months preceding the event giving rise to the claim. We are not liable for indirect, incidental, or
            consequential damages.
          </p>
        </article>

        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>7. Changes</h2>
          <p>
            We may update these Terms from time to time. Material changes will be announced in-app or by email. Continued
            use of the service after changes take effect constitutes acceptance of the new Terms.
          </p>
        </article>

        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>8. Contact</h2>
          <p>
            Questions about these Terms can be sent to <a href="mailto:support@ai-secretary.site">support@ai-secretary.site</a>.
          </p>
        </article>
      </section>
    </main>
  );
}
