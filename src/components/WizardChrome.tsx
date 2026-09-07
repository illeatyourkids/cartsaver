import { Link } from "react-router-dom";
import { ThanksLogo } from "./ThanksLogo";

const STEPS = [
  { key: "sync", label: "Sync", to: "/campaign/sync" },
  { key: "settings", label: "Settings", to: "/campaign/settings" },
  { key: "preview", label: "Preview", to: "/campaign/preview" }
] as const;

function activeKey(pathname: string) {
  if (pathname.includes("/sync") || pathname.includes("/store")) return "sync";
  if (pathname.includes("/settings") || pathname.includes("/offer")) return "settings";
  if (pathname.includes("/preview")) return "preview";
  return "";
}

export function WizardChrome({ pathname }: { pathname: string }) {
  const current = activeKey(pathname);
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <header className="wizard-chrome">
      <div className="wizard-chrome-inner">
        <Link to="/" className="brand-mark" aria-label="thanks.io">
          <ThanksLogo />
        </Link>
        {current ? (
          <nav className="stepper" aria-label="Campaign steps">
            {STEPS.map((step, index) => {
              const state =
                step.key === current ? "active" : index < currentIndex ? "done" : "upcoming";
              return (
                <div key={step.key} className="stepper-segment">
                  {index > 0 ? (
                    <span
                      className={`stepper-connector ${index <= currentIndex ? "filled" : ""}`}
                      aria-hidden
                    />
                  ) : null}
                  <Link
                    to={step.to}
                    className={`stepper-item ${state}`}
                    aria-current={step.key === current ? "step" : undefined}
                  >
                    <span className="stepper-num" aria-hidden>
                      {state === "done" ? "✓" : index + 1}
                    </span>
                    <span className="stepper-label">{step.label}</span>
                  </Link>
                </div>
              );
            })}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
