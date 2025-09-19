export default function Privacy() {
  return (
    <main className="container" style={{ maxWidth: 860, padding: "40px 20px 80px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>Privacy Notice</h1>
      <p style={{ color: "#6b7280", marginBottom: 28 }}>
        WakeStake respects your privacy. This notice explains what data we collect, how we use it, and the choices you have.
      </p>

      <section style={{ display: "grid", gap: 20 }}>
        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Information We Collect</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Account: email address, authentication tokens (handled by Supabase).</li>
            <li>Profile: home latitude/longitude, timezone, desired wake time, stake amount.</li>
            <li>Usage: check-in timestamps, location accuracy, streak history, billing activity.</li>
            <li>Payments: managed by Stripe; we do not store full payment method details.</li>
          </ul>
        </article>

        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>How We Use Data</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Authenticate and secure your account.</li>
            <li>Determine whether you met your wake commitment based on location checks.</li>
            <li>Calculate streaks and gentle reminders when commitments are missed.</li>
            <li>Process metered billing through Stripe for missed days.</li>
            <li>Deliver service announcements and respond to support requests.</li>
          </ul>
        </article>

        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Sharing & Transfers</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Supabase acts as our backend provider for authentication and database storage.</li>
            <li>Stripe processes payments and stores customer billing profiles.</li>
            <li>We do not sell personal information to third parties.</li>
            <li>Data may be processed outside your home country where our providers operate; we rely on their contractual safeguards.</li>
          </ul>
        </article>

        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Retention</h2>
          <p>
            We retain account and check-in data while your account is active. You may request deletion at any time by
            contacting us; we will remove non-financial records within 30 days unless retention is required by law.
            Billing records follow Stripe's retention obligations.
          </p>
        </article>

        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Your Choices</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>You can update wake settings and email from within the app.</li>
            <li>For data export or deletion, email <a href="mailto:support@ai-secretary.site">support@ai-secretary.site</a>.</li>
            <li>Location services can be disabled in your device settings, but the service will not function without them.</li>
          </ul>
        </article>

        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Children</h2>
          <p>
            WakeStake is not directed to children under 13. We do not knowingly collect data from minors. If you believe a child
            has provided us personal information, contact us promptly for removal.
          </p>
        </article>

        <article className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Contact</h2>
          <p>
            Privacy questions: <a href="mailto:support@ai-secretary.site">support@ai-secretary.site</a>
          </p>
        </article>
      </section>
    </main>
  );
}
