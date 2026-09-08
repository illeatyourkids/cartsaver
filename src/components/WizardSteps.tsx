import { Link } from "react-router-dom";

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

export function WizardSteps({ pathname }: { pathname: string }) {
  const current = activeKey(pathname);
  if (!current) return null;

  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <nav className="wizard-steps" aria-label="Campaign steps">
      <div className="wizard-steps__inner stepper">
        {STEPS.map((step, index) => {
          const state = step.key === current ? "active" : index < currentIndex ? "done" : "upcoming";
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
      </div>
    </nav>
  );
}
