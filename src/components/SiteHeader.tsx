import { ThanksLogo } from "./ThanksLogo";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a
          className="brand-mark"
          href="https://www.thanks.io"
          target="_blank"
          rel="noreferrer"
          aria-label="thanks.io"
        >
          <ThanksLogo />
        </a>
      </div>
    </header>
  );
}
