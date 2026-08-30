import { ThanksLogo } from "./ThanksLogo";

const THANKS_HOME = "https://www.thanks.io";
const THANKS_PRIVACY = "https://www.thanks.io/privacy";
const THANKS_TERMS = "https://www.thanks.io/terms";
const THANKS_HELP = "https://help.thanks.io";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="site-footer-powered">
          Powered by{" "}
          <a
            className="site-footer-thanks"
            href={THANKS_HOME}
            target="_blank"
            rel="noreferrer"
          >
            <ThanksLogo />
          </a>
        </p>
        <nav className="site-footer-links" aria-label="Legal and support">
          <a href={THANKS_PRIVACY} target="_blank" rel="noreferrer">
            Privacy
          </a>
          <a href={THANKS_TERMS} target="_blank" rel="noreferrer">
            Terms
          </a>
          <a href={THANKS_HELP} target="_blank" rel="noreferrer">
            Help
          </a>
        </nav>
      </div>
    </footer>
  );
}
