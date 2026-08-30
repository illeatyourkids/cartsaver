import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { primaryColorFromImage } from "../lib/logoColor";

export const LOGO_ASPECT = 2.1 / 0.7;
const OUT_W = 1260;
const OUT_H = Math.round(OUT_W / LOGO_ASPECT);

type Pan = { x: number; y: number };

function fitScale(nw: number, nh: number, boxW: number, boxH: number) {
  return Math.min(boxW / nw, boxH / nh);
}

function clampPan(pan: Pan, zoom: number, nw: number, nh: number, boxW: number, boxH: number): Pan {
  const s = fitScale(nw, nh, boxW, boxH) * zoom;
  const dispW = nw * s;
  const dispH = nh * s;
  const maxX = Math.max(0, (dispW - boxW) / 2);
  const maxY = Math.max(0, (dispH - boxH) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y))
  };
}

function cropToDataUrl(
  img: HTMLImageElement,
  pan: Pan,
  zoom: number,
  boxW: number,
  boxH: number
) {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const s = fitScale(nw, nh, boxW, boxH) * zoom;
  const dispW = nw * s;
  const dispH = nh * s;
  const left = (boxW - dispW) / 2 + pan.x;
  const top = (boxH - dispH) / 2 + pan.y;
  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.clearRect(0, 0, OUT_W, OUT_H);
  ctx.drawImage(
    img,
    0,
    0,
    nw,
    nh,
    (left / boxW) * OUT_W,
    (top / boxH) * OUT_H,
    (dispW / boxW) * OUT_W,
    (dispH / boxH) * OUT_H
  );
  return canvas.toDataURL("image/png");
}

export function LogoCropper({
  value,
  knownColor,
  onChange
}: {
  value: string;
  knownColor?: string;
  onChange: (dataUrl: string, brandColor?: string) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const sourceRef = useRef<string | null>(null);
  const brandRef = useRef<string | undefined>(knownColor);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [source, setSource] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const panRef = useRef<Pan>(pan);
  const zoomRef = useRef(zoom);
  panRef.current = pan;
  zoomRef.current = zoom;
  const drag = useRef<{ x: number; y: number; pan: Pan } | null>(null);
  const sampledRef = useRef(false);

  const hasUpload = Boolean(source);
  const showValue = !hasUpload && Boolean(value) && !/placeholder/.test(value);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasUpload]);

  const emitCrop = useCallback((nextPan: Pan, nextZoom: number) => {
    const img = imgRef.current;
    const box = viewportRef.current;
    if (!img || !box || box.clientWidth < 8) return;
    const clipped = clampPan(
      nextPan,
      nextZoom,
      img.naturalWidth,
      img.naturalHeight,
      box.clientWidth,
      box.clientHeight
    );
    onChangeRef.current(
      cropToDataUrl(img, clipped, nextZoom, box.clientWidth, box.clientHeight),
      brandRef.current
    );
  }, []);

  useEffect(() => {
    if (!source || size.w < 8 || !imgRef.current) return;
    emitCrop({ x: 0, y: 0 }, 1);
  }, [source, size.w, emitCrop]);

  useEffect(() => {
    return () => {
      if (sourceRef.current) URL.revokeObjectURL(sourceRef.current);
    };
  }, []);

  useEffect(() => {
    if (knownColor || !showValue || !value || sampledRef.current) return;
    sampledRef.current = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const color = primaryColorFromImage(img) || undefined;
      if (color) onChangeRef.current(value, color);
    };
    img.src = value;
  }, [knownColor, showValue, value]);

  const onFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current);
    const url = URL.createObjectURL(file);
    sourceRef.current = url;
    const img = new Image();
    img.onload = () => {
      brandRef.current = primaryColorFromImage(img) || undefined;
      imgRef.current = img;
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setSource(url);
    };
    img.src = url;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!hasUpload) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, pan: panRef.current };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !imgRef.current || !viewportRef.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    const next = clampPan(
      { x: drag.current.pan.x + dx, y: drag.current.pan.y + dy },
      zoomRef.current,
      imgRef.current.naturalWidth,
      imgRef.current.naturalHeight,
      viewportRef.current.clientWidth,
      viewportRef.current.clientHeight
    );
    panRef.current = next;
    setPan(next);
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    emitCrop(panRef.current, zoomRef.current);
  };

  const onZoom = (nextZoom: number) => {
    const img = imgRef.current;
    const box = viewportRef.current;
    if (!img || !box) {
      zoomRef.current = nextZoom;
      setZoom(nextZoom);
      return;
    }
    const clipped = clampPan(
      panRef.current,
      nextZoom,
      img.naturalWidth,
      img.naturalHeight,
      box.clientWidth,
      box.clientHeight
    );
    zoomRef.current = nextZoom;
    panRef.current = clipped;
    setZoom(nextZoom);
    setPan(clipped);
    emitCrop(clipped, nextZoom);
  };

  const imgStyle = (() => {
    const img = imgRef.current;
    if (!img || !size.w) return undefined;
    const s = fitScale(img.naturalWidth, img.naturalHeight, size.w, size.h) * zoom;
    const dispW = img.naturalWidth * s;
    const dispH = img.naturalHeight * s;
    return {
      width: dispW,
      height: dispH,
      left: (size.w - dispW) / 2 + pan.x,
      top: (size.h - dispH) / 2 + pan.y
    };
  })();

  return (
    <div className="logo-crop" aria-labelledby="logo-label" aria-describedby="logo-help">
      <input
        ref={inputRef}
        className="logo-crop__file"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <div
        ref={viewportRef}
        className={`logo-crop__frame${hasUpload ? " logo-crop__frame--live" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => {
          if (!hasUpload) inputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!hasUpload && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-label={hasUpload ? "Logo crop" : "Upload logo"}
      >
        {hasUpload && source ? (
          <img src={source} alt="" draggable={false} style={imgStyle} />
        ) : showValue ? (
          <img src={value} alt="" className="logo-crop__fitted" />
        ) : (
          <span className="logo-crop__hint">Upload logo</span>
        )}
      </div>
      <div className="logo-crop__bar">
        <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()}>
          {hasUpload || showValue ? "Replace" : "Upload"}
        </button>
        {hasUpload ? (
          <label className="logo-crop__zoom">
            <span>Zoom</span>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => onZoom(Number(e.target.value))}
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}
