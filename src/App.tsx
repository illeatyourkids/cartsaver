import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { SiteFooter } from "./components/SiteFooter";
import { WizardChrome } from "./components/WizardChrome";
import { CampaignProvider } from "./context/CampaignContext";
import { LandingPage } from "./pages/LandingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PreviewPage } from "./pages/PreviewPage";
import { PrintPostcardView } from "./pages/PrintPostcardView";
import { SyncPage } from "./pages/SyncPage";

function PrintRoute() {
  const { cartid = "" } = useParams();
  const side = new URLSearchParams(useLocation().search).get("side") === "back" ? "back" : "front";
  return <PrintPostcardView cartid={cartid} side={side} />;
}

function AppShell() {
  const location = useLocation();
  const isPrint = location.pathname.startsWith("/print/");
  const showChrome = location.pathname.startsWith("/campaign");

  if (isPrint) {
    return (
      <Routes>
        <Route path="/print/:cartid" element={<PrintRoute />} />
      </Routes>
    );
  }

  return (
    <>
      {showChrome ? <WizardChrome pathname={location.pathname} /> : null}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/campaign" element={<Navigate to="/campaign/sync" replace />} />
        <Route path="/campaign/sync" element={<SyncPage />} />
        <Route path="/campaign/store" element={<Navigate to="/campaign/sync" replace />} />
        <Route path="/campaign/settings" element={<SettingsPage />} />
        <Route path="/campaign/offer" element={<Navigate to="/campaign/settings" replace />} />
        <Route path="/campaign/preview" element={<PreviewPage />} />
      </Routes>
      <SiteFooter />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CampaignProvider>
        <AppShell />
      </CampaignProvider>
    </BrowserRouter>
  );
}
