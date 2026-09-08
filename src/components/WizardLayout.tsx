import { Outlet, useLocation } from "react-router-dom";
import { WizardSteps } from "./WizardSteps";

export function WizardLayout() {
  const { pathname } = useLocation();
  const wide = pathname.includes("/preview");

  return (
    <div className={`wizard-shell${wide ? " wizard-shell--wide" : ""}`}>
      <WizardSteps pathname={pathname} />
      <Outlet />
    </div>
  );
}
