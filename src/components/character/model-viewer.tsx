"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODEL_BASE } from "@/lib/config";
import { FittedRender } from "@/components/character/fitted-render";
import { specBg, topSpec, type CharacterDetail } from "@/lib/wow";

// zamimg 모델뷰어 (WEB_PROJECT index.html 과 동일 버전)
const JQUERY = "https://code.jquery.com/jquery-3.5.1.min.js";
const ZAM_VIEWER = "https://wow.zamimg.com/modelviewer/mists/deployment/viewer/810d077/viewer.min.js";
const CONTENT_PATH = `${MODEL_BASE}/classicplus/`; // 로컬: /mv (next.config rewrite) · 운영: wow-forever Worker /mv

// 장비 슬롯 → 모델뷰어 슬롯 (WEB_PROJECT _EQ_SLOT_MAP / VISUAL_SLOTS)
const VIEW_SLOT: Record<string, number> = {
  HEAD: 1, SHOULDER: 3, SHIRT: 4, CHEST: 5, WAIST: 6, LEGS: 7, FEET: 8,
  WRIST: 9, HANDS: 10, BACK: 16, MAIN_HAND: 21, OFF_HAND: 22, TABARD: 19,
};

type Viewer = { renderer?: { actors?: { setAnimation?: (a: string) => void }[] }; modelId?: number; droppedOptions?: number };
type RenderFn = (sel: string, aspect: number, m: unknown) => Promise<Viewer>;
declare global {
  interface Window { CONTENT_PATH?: string; renderForever?: RenderFn; jQuery?: unknown; ZamModelViewer?: unknown }
}

function loadScript(src: string, test: () => boolean) {
  return new Promise<void>((res, rej) => {
    if (test()) return res();
    const ex = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    const s = ex ?? Object.assign(document.createElement("script"), { src, async: false });
    s.addEventListener("load", () => res());
    s.addEventListener("error", () => rej(new Error(`스크립트 로드 실패: ${src}`)));
    if (!ex) document.head.appendChild(s);
  });
}

let viewerReady: Promise<RenderFn> | null = null;
function ensureViewer(): Promise<RenderFn> {
  if (viewerReady) return viewerReady;
  window.CONTENT_PATH = CONTENT_PATH;
  viewerReady = (async () => {
    await loadScript(JQUERY, () => !!window.jQuery);
    await loadScript(ZAM_VIEWER, () => !!window.ZamModelViewer);
    // ES module 로더 (번들러 우회)
    await new Promise<void>((res, rej) => {
      const s = document.createElement("script");
      s.type = "module";
      s.textContent = `import { renderForever } from "/lib/wow-model-viewer/forever.js"; window.renderForever = renderForever; window.dispatchEvent(new Event("forever-viewer-ready"));`;
      window.addEventListener("forever-viewer-ready", () => res(), { once: true });
      s.onerror = () => rej(new Error("뷰어 모듈 로드 실패"));
      document.head.appendChild(s);
      setTimeout(() => !window.renderForever && rej(new Error("뷰어 로딩 타임아웃")), 15000);
    });
    return window.renderForever!;
  })();
  viewerReady.catch(() => { viewerReady = null; });
  return viewerReady;
}

// 가슴 슬롯: 로브류는 20 (WEB_PROJECT resolveChest와 동일 — armor/5 meta 없으면 20)
const chestCache = new Map<number, number>();
async function chestSlot(did: number) {
  if (chestCache.has(did)) return chestCache.get(did)!;
  let slot = 5;
  try {
    const r = await fetch(`${CONTENT_PATH}meta/armor/5/${did}.json`, { method: "HEAD", signal: AbortSignal.timeout(2000) });
    slot = r.ok ? 5 : 20;
  } catch { slot = 20; }
  chestCache.set(did, slot);
  return slot;
}

async function buildModel(c: CharacterDetail) {
  const items: [number, number][] = [];
  for (const e of c.equipment) {
    const s = VIEW_SLOT[e.slot];
    if (!s || !e.displayId) continue;
    items.push([s === 5 ? await chestSlot(e.displayId) : s, e.displayId]);
  }
  return {
    race: c.raceId,
    gender: (c.appearance?.gender ?? c.gender?.type) === "FEMALE" ? 1 : 0,
    options: (c.appearance?.customizations ?? []).map((o) => ({ optionId: o.option, choiceId: o.choice })),
    items,
  };
}

function disposeCanvas(el: HTMLElement | null) {
  const cv = el?.querySelector("canvas");
  try { (cv?.getContext("webgl") as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext(); } catch {}
  if (el) el.innerHTML = "";
}

let seq = 0;

export function ModelViewer({ c }: { c?: CharacterDetail }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"3d" | "2d">("2d"); // 기본 2D (가벼움) → 3D는 버튼으로
  const [state, setState] = useState<"idle" | "loading" | "ok" | "fail">("idle");
  const [err, setErr] = useState("");
  const [hostId] = useState(() => `model3d_${++seq}`);

  useEffect(() => {
    const host = document.getElementById(hostId);
    if (mode !== "3d" || !c) { disposeCanvas(host); return; }
    let alive = true;
    setState("loading");
    (async () => {
      try {
        const [render, model] = await Promise.all([ensureViewer(), buildModel(c)]);
        if (!alive || !host) return;
        disposeCanvas(host);
        const r = wrap.current?.getBoundingClientRect();
        const aspect = r && r.height > 0 ? r.width / r.height : 0.75;
        const v = await render(`#${hostId}`, aspect, model);
        if (!alive) { disposeCanvas(host); return; }
        const cv = host.querySelector("canvas");
        if (cv) Object.assign(cv.style, { width: "100%", height: "100%", display: "block" });
        const inner = host.querySelector<HTMLElement>(":scope > div[style]");
        if (inner) Object.assign(inner.style, { width: "100%", height: "100%" });
        setState("ok");
        const msg = `race ${model.race} ${model.gender ? "여" : "남"} → model ${v.modelId} · 외형 옵션 ${model.options.length - (v.droppedOptions ?? 0)}/${model.options.length} · 장비 ${model.items.length}개 [${model.items.map((i) => i.join(":")).join(" ")}]`;
        console.info("[3D]", c.slug, msg);
        // Stand 애니메이션 (액터 준비 후)
        const t0 = Date.now();
        const tick = setInterval(() => {
          const a = v?.renderer?.actors?.[0];
          if (!alive || Date.now() - t0 > 8000) return clearInterval(tick);
          if (typeof a?.setAnimation === "function") { a.setAnimation("Stand"); clearInterval(tick); }
        }, 120);
      } catch (e) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : String(e));
        console.error("[3D] 실패", c.slug, e);
        setState("fail");
      }
    })();
    return () => { alive = false; disposeCanvas(host); };
  }, [c, mode, hostId]);

  const show2d = mode === "2d" || state === "fail";
  const bg = specBg(c?.classId, topSpec(c));

  return (
    <div
      ref={wrap}
      className="relative h-[calc(var(--slot)*8+63px)] w-[calc((var(--slot)*3+6rem)*1.5)] min-w-0 shrink overflow-hidden rounded bg-cover bg-center shadow-[0_2px_12px_rgba(0,0,0,.5)] transition-[background-image] duration-500"
      style={bg ? { backgroundImage: `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.72)), url('${bg}')` } : undefined}
    >
      <div id={hostId} className={cn("absolute inset-0", show2d && "invisible")} />

      {show2d && c?.render && <FittedRender key={c.id} src={c.render} />}

      {/* WEB_PROJECT .overlay / .spin */}
      {mode === "3d" && state === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[rgba(8,6,2,.55)] transition-opacity">
          <div className="spin" />
          <div className="text-fl-xs font-medium tracking-[1px] text-tx3">소환 중...</div>
        </div>
      )}
      {mode === "3d" && state === "fail" && (
        <div className="absolute inset-x-0 bottom-9 text-center text-fl-2xs text-[var(--red)]">3D 실패 · {err} — 2D 렌더 표시</div>
      )}

      <div className="absolute right-2 top-2 flex overflow-hidden rounded-md border border-line2 bg-black/50 text-fl-2xs font-bold backdrop-blur">
        {(["2d", "3d"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn("flex items-center gap-1 px-2 py-1 transition-colors", mode === m ? "bg-white/15 text-tx1" : "text-tx3 hover:text-tx2")}
          >
            {m === "3d" ? <Box className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
            {m.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
