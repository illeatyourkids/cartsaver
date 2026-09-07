import { Link } from "react-router-dom";
import { LogoScroller } from "../components/LogoScroller";
import { ThanksLogo } from "../components/ThanksLogo";
import { SAMPLE_POSTCARD } from "../data/samplePostcard";
import { CartBack } from "../templates/CartBack";
import { CartFront } from "../templates/CartFront";

const FEATURES = [
  "Target only the carts worth chasing",
  "Automatically include the abandoned products",
  "Add a personalized discount",
  "QR code restores their cart instantly",
  "Send within hours or days of abandonment",
  "Set minimum cart values and maximum discounts",
  "Track scans, conversions, revenue, and ROI"
];

const FLOW = [
  { label: "Abandoned Cart", image: "/landing-flow/step-1.jpg" },
  { label: "Personalized Postcard", image: "/landing-flow/step-2.jpg" },
  { label: "Preloaded Cart", image: "/landing-flow/step-3.jpg" },
  { label: "Purchase", image: "/landing-flow/step-4.jpg" }
];

export function LandingPage() {
  return (
    <div className="landing-shell">
      <div className="app-main landing-page">
        <a
          className="landing-brand"
          href="https://www.thanks.io"
          target="_blank"
          rel="noreferrer"
          aria-label="thanks.io"
        >
          <ThanksLogo />
        </a>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="landing-rating" aria-label="Google rating 4.8">
              <svg className="landing-rating__g" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>4.8</span>
              <svg className="landing-rating__star" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#F4B400"
                  d="M12 2.5l2.76 6.18 6.74.62-5.08 4.6 1.48 6.6L12 17.02 6.1 20.5l1.48-6.6L2.5 9.3l6.74-.62L12 2.5z"
                />
              </svg>
            </p>
            <h1 className="page-title">Turn Abandoned Carts Into Revenue</h1>
            <p className="page-lead">
              Get 5–10X ROI with hyper-targeted oversized postcards that bring shoppers straight back
              to their cart—with their discount already applied. When someone leaves items behind, we
              match their email to a mailing address at industry-leading accuracy, then mail a 6×11
              card with those products, their offer, and a QR code that opens the exact cart, ready to
              check out.
            </p>
            <Link className="btn btn-primary landing-cta" to="/campaign/sync">
              Easy, 5 Min Setup
            </Link>
            <p className="landing-cta-note">Connect your store and launch in minutes.</p>
          </div>
          <div className="landing-mockup" aria-label="Sample Brooklinen abandoned cart postcard">
            <div className="landing-mockup__card landing-mockup__card--back">
              <CartBack view={SAMPLE_POSTCARD} showLabel={false} layout="sample" />
            </div>
            <div className="landing-mockup__card landing-mockup__card--front">
              <CartFront view={SAMPLE_POSTCARD} showLabel={false} />
            </div>
          </div>
        </section>

        <LogoScroller />

        <section className="landing-story">
          <p className="landing-kicker">
            Someone almost bought from you. Don’t settle for another ignored email.
          </p>
          <p>
            Thanks.io automatically sends a personalized 6×11 postcard to high-value cart abandoners,
            featuring the products they left behind and a unique QR code that opens their exact cart,
            ready to checkout.
          </p>
          <p className="landing-punch">Email gets deleted. This gets noticed.</p>
          <ol className="landing-flow">
            {FLOW.map((step, i) => (
              <li key={step.label} style={{ backgroundImage: `url(${step.image})` }}>
                <div className="landing-flow__content">
                  <span className="landing-flow__num">{i + 1}</span>
                  <span className="landing-flow__label">{step.label}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-points">
          <ul>
            {FEATURES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="landing-runs">No manual campaigns. It just runs.</p>
          <p>One recovered order can pay for dozens of postcards.</p>
        </section>

        <section className="landing-close">
          <h2>Your best prospects already told you exactly what they want.</h2>
          <p>Put it back in front of them.</p>
          <Link className="btn btn-primary landing-cta" to="/campaign/sync">
            Easy, 5 Min Setup
          </Link>
        </section>
      </div>
    </div>
  );
}
