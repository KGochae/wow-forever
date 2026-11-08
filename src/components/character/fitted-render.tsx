"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Blizzard 공식 렌더(main-raw, 1600×1200 가로, 캐릭터는 가운데 40~56%만 차지)를
 * 캐릭터 실제 영역(알파 바운딩박스) 기준으로 확대해 세로 프레임을 꽉 채움.
 * render.worldofwarcraft.com 은 CORS * → canvas로 픽셀 분석 가능.
 */
type Box = { x0: number; y0: number; x1: number; y1: number }; // 0~1 비율

const boxCache = new Map<string, Box | null>();

async function measure(src: string): Promise<Box | null> {
  if (boxCache.has(src)) return boxCache.get(src)!;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();
  // 1/8 축소 분석 (200×150) — 충분히 정확하고 빠름
  const W = Math.max(1, Math.round(img.naturalWidth / 8)), H = Math.max(1, Math.round(img.naturalHeight / 8));
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, W, H);
  const a = ctx.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (a[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const box = x1 < 0 ? null : { x0: x0 / W, y0: y0 / H, x1: (x1 + 1) / W, y1: (y1 + 1) / H };
  boxCache.set(src, box);
  return box;
}

export function FittedRender({ src, fill = 0.88 }: { src: string; fill?: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null | undefined>(boxCache.get(src));
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    let alive = true;
    if (!boxCache.has(src)) measure(src).then((b) => alive && setBox(b)).catch(() => alive && setBox(null));
    else setBox(boxCache.get(src));
    return () => { alive = false; };
  }, [src]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 원본 비율 4:3 (1600×1200) 기준 배치
  let style: React.CSSProperties = { inset: 0, width: "100%", height: "100%", objectFit: "contain" };
  if (box && size.w && size.h) {
    const IW = 1600, IH = 1200;
    const bw = (box.x1 - box.x0) * IW, bh = (box.y1 - box.y0) * IH;
    const s = Math.min((size.h * fill) / bh, (size.w * 0.92) / bw); // 높이 우선, 넓은 무기는 폭 제한
    const cx = ((box.x0 + box.x1) / 2) * IW * s;
    const bottom = box.y1 * IH * s;
    const groundY = size.h * (0.5 + fill / 2); // 발 위치: 위아래 여백 균등
    style = { width: IW * s, height: IH * s, left: size.w / 2 - cx, top: groundY - bottom, maxWidth: "none" };
  }

  return (
    <div ref={wrap} className="absolute inset-0 overflow-hidden">
      {box !== undefined && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" crossOrigin="anonymous" className="anim-img absolute" style={style} draggable={false} />
      )}
    </div>
  );
}
