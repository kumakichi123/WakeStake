import Link from "next/link";

const features = [
  {
    title: "Only pay when you snooze",
    body: "Putting real money at stake keeps you honest. You only get charged if you oversleep.",
  },
  {
    title: "Proof you stepped outside",
    body: "WakeStake confirms you left your home radius with precise GPS before your deadline.",
  },
  {
    title: "Track your streak",
    body: "See wins, nudges, and long-term progress so your new routine sticks for good.",
  },
];

const steps = [
  "Pin your home base and wake deadline.",
  "Pick a stake that makes sleeping in costly.",
  "Slide to check out once you're out the door.",
];

const useCases = [
  {
    title: "Morning workouts, finally",
    body: "Commit to a sunrise run or gym session. Skipping costs money; showing up builds momentum.",
  },
  {
    title: "Force a morning routine",
    body: "Lock in wake time, breakfast, journaling, or study blocks until the habit sticks for good.",
  },
  {
    title: "Fix chronic lateness",
    body: "Need to reach class or work on time? The stake nudges you out the door before the rush.",
  },
  {
    title: "Make space for side projects",
    body: "Claim quiet time for code, reading, or exam prep before the rest of the day begins.",
  },
];

export default function Page() {
  return (
    <main className="landing">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="badge">Wake up with purpose</span>
          <h1>Beat your alarm with real accountability.</h1>
          <p className="hero-disclaimer">You are charged only when you miss your check-out window.</p>
          <p>
            WakeStake helps you build consistent mornings. Set a wake deadline, walk outside, and only pay when you
            miss. Your future self will thank you.
          </p>
          <div className="landing-hero-cta">
            <Link className="btn" href="/signup">
              Get started
            </Link>
          </div>

          <div className="hero-metrics">
            <div>
              <strong>60 min</strong>
              <span>Grace window before your deadline</span>
            </div>
            <div>
              <strong>$1 to $100</strong>
              <span>Flexible wake stakes that motivate you</span>
            </div>
            <div>
              <strong>70 m</strong>
              <span>Step past your home radius to win</span>
            </div>
          </div>
        </div>

        <div className="landing-hero-card">
          <div className="card-body">
            <h2>Sample check-in: Tomorrow at 7:00</h2>
            <p>Slide to check out when you step outside. Miss it and $10 goes to your future self fund.</p>
            <ul>
              <li>Wake window: 06:00 - 07:00</li>
              <li>Home radius: 70 m</li>
              <li>Current streak: 4 mornings</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="landing-section">
        <h2>How WakeStake keeps you moving</h2>
        <div className="landing-grid">
          {features.map(feature => (
            <article key={feature.title} className="card feature-card">
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section use-cases">
        <h2>Perfect when you want results</h2>
        <p className="section-sub">
          Morning momentum compounds: fewer distractions, brighter light, higher willpower, and habits that actually stick.
        </p>
        <div className="landing-grid">
          {useCases.map(useCase => (
            <article key={useCase.title} className="card feature-card">
              <h3>{useCase.title}</h3>
              <p>{useCase.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section steps">
        <h2>Mornings become simple</h2>
        <ol>
          {steps.map((step, index) => (
            <li key={step}>
              <span className="step-number">{index + 1}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section cta">
        <div className="card cta-card">
          <div>
            <h2>Start tomorrow with momentum</h2>
            <p>Join early risers who are finally leaving the snooze button behind.</p>
          </div>
          <div className="cta-actions">
            <Link className="btn" href="/signup">
              Get started
            </Link>
            <Link className="btn link" href="/signin">
              I already have one
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

