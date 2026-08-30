import { useState, type MouseEvent } from "react";
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

const FLOW = ["Abandoned Cart", "Personalized Postcard", "Preloaded Cart", "Purchase"];

export function LandingPage() {
  const [hover, setHover] = useState<"front" | "back" | null>(null);
  const raised = hover ?? "front";

  function raiseFromPointer(event: MouseEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    setHover(x > 0.42 && y > 0.28 ? "back" : "front");
  }

  return (
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
          <h1 className="page-title">Turn Abandoned Carts Into Revenue</h1>
          <p className="page-lead">
            Get 5–10X ROI with hyper-targeted oversized postcards that bring shoppers straight back
            to their cart—with their discount already applied.
          </p>
          <Link className="btn btn-primary" to="/campaign/sync">
            Easy, 5 Min Setup
          </Link>
          <p className="landing-cta-note">Connect your store and launch in minutes.</p>
        </div>
        <div
          className="landing-mockup"
          aria-label="Sample Brooklinen postcard. Hover a side to bring it forward."
          onMouseMove={raiseFromPointer}
          onMouseLeave={() => setHover(null)}
        >
          <div
            className={`landing-mockup__card landing-mockup__card--back${raised === "back" ? " is-on-top" : ""}${hover === "back" ? " is-lifted" : ""}`}
          >
            <span className="landing-mockup__tag">Back</span>
            <CartBack view={SAMPLE_POSTCARD} showLabel={false} layout="sample" />
          </div>
          <div
            className={`landing-mockup__card landing-mockup__card--front${raised === "front" ? " is-on-top" : ""}${hover === "front" ? " is-lifted" : ""}`}
          >
            <span className="landing-mockup__tag">Front</span>
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
            <li key={step}>
              <span className="landing-flow__num">{i + 1}</span>
              {step}
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
        <Link className="btn btn-primary" to="/campaign/sync">
          Easy, 5 Min Setup
        </Link>
      </section>
    </div>
  );
}
