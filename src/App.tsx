import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import { ThanksTokenRouter } from "./components/ThanksTokenRouter";
import { WizardLayout } from "./components/WizardLayout";
import { CampaignProvider } from "./context/CampaignContext";
import { AdminPage } from "./pages/AdminPage";
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

  if (isPrint) {
    return (
      <Routes>
        <Route path="/print/:cartid" element={<PrintRoute />} />
      </Routes>
    );
  }

  return (
    <>
      <ThanksTokenRouter />
      <SiteHeader />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route element={<WizardLayout />}>
          <Route path="/campaign" element={<Navigate to="/campaign/sync" replace />} />
          <Route path="/campaign/sync" element={<SyncPage />} />
          <Route path="/campaign/store" element={<Navigate to="/campaign/sync" replace />} />
          <Route path="/campaign/settings" element={<SettingsPage />} />
          <Route path="/campaign/offer" element={<Navigate to="/campaign/settings" replace />} />
          <Route path="/campaign/preview" element={<PreviewPage />} />
        </Route>
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
