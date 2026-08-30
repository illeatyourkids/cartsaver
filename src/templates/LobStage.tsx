import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cardThemeVars } from "../lib/logoColor";
import { PostcardShell } from "./PostcardShell";

export const LOB_WIDTH_IN = 11.25;
export const LOB_HEIGHT_IN = 6.25;
const CSS_DPI = 96;
export const PRINT_WIDTH_PX = 3337;
export const PRINT_HEIGHT_PX = 1777;

export function LobStage({
  children,
  label,
  className = "",
  print = false,
  ink
}: {
  children: ReactNode;
  label?: string;
  className?: string;
  print?: boolean;
  ink?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.35);
  const theme = cardThemeVars(ink) as CSSProperties;

  useEffect(() => {
    if (print) return;
    const el = viewportRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / (LOB_WIDTH_IN * CSS_DPI));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [print]);

  if (print) {
    const cssW = LOB_WIDTH_IN * CSS_DPI;
    const cssH = LOB_HEIGHT_IN * CSS_DPI;
    const stageStyle = {
      width: `${LOB_WIDTH_IN}in`,
      height: `${LOB_HEIGHT_IN}in`,
      transform: `scale(${PRINT_WIDTH_PX / cssW}, ${PRINT_HEIGHT_PX / cssH})`,
      transformOrigin: "top left"
    } as CSSProperties;
    return (
      <div
        className={`lob-print-root lob-shell ${className}`}
        style={{
          width: PRINT_WIDTH_PX,
          height: PRINT_HEIGHT_PX,
          overflow: "hidden",
          position: "relative",
          ...theme
        }}
      >
        <div className="lob-safe-area" style={{ ...stageStyle, ...theme }}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <PostcardShell className={`lob-shell ${className}`} label={label}>
      <div ref={viewportRef} className="lob-stage-viewport" style={theme}>
        <div
          className="lob-safe-area"
          style={
            {
              transform: `scale(${scale})`,
              width: `${LOB_WIDTH_IN}in`,
              height: `${LOB_HEIGHT_IN}in`,
              ...theme
            } as CSSProperties
          }
        >
          {children}
        </div>
      </div>
    </PostcardShell>
  );
}
