import type { ReactNode } from "react";

export function PostcardShell({
  children,
  className = "",
  label
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div className={`postcard-shell ${className}`}>
      {label ? <div className="postcard-shell__label">{label}</div> : null}
      <div className="postcard-shell__stage">{children}</div>
    </div>
  );
}
