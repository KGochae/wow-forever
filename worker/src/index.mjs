// wow-forever Worker — WEB_PROJECT(wow-proxy)와 분리된 WOW_FOREVER 전용
//
//   GET  /forever/data/{key}        R2(DATA) 데이터 제공 — index.json · rank.json · chars/{id}.json · talents/{cls}.json (state/ 차단)
//   POST /forever/refresh?c={slug}  Update 버튼 — Blizzard 실시간 조회 → R2 갱신 → 새 캐릭터 JSON 반환
//   GET  /mv/{env}/...              3D 모델 프록시 — R2(MODEL_CACHE) → 엣지 캐시 → zamimg (WEB_PROJECT와 같은 키 규칙)
//   GET|PUT /forever/ingest/{key}   수집기 전용 (Authorization: Bearer INGEST_TOKEN) — R2 API 키 없이 Worker 바인딩으로 읽기·쓰기
//
// 바인딩: DATA(R2 wow-forever-data) · MODEL_CACHE(R2 wow-model-cache, 기존) · RATE(KV)
// 시크릿: BLIZZARD_CLIENT_ID · BLIZZARD_CLIENT_SECRET · INGEST_TOKEN(수집기 업로드용)
// 변수: REGION · ALLOWED_ORIGINS(쉼표 구분) · REFRESH_COOLDOWN_SEC · REFRESH_IP_PER_HOUR
import { createBnet, NS } from "../../collector/lib/bnet.mjs";
import { buildCharacter, equippedItemIds, fetchCharacterRaw, indexEntry } from "../../collector/lib/transform.mjs";

const ZAMIMG = "https://wow.zamimg.com";
const ZAM_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "*/*",
  Referer: "https://www.wowhead.com/",
  Origin: "https://www.wowhead.com",
};
const DATA_CACHE = "public, max-age=300, s-maxage=3600, stale-while-revalidate=600";

// ── CORS ──
function cors(request, env) {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const allow = allowed.includes(origin) ? origin : allowed[0] ?? "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
const json = (body, status, headers) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });

// ── 1. 데이터 ──
async function handleData(request, env, key, h) {
  if (!key || key.startsWith("state/") || key.includes("..")) return json({ error: "not found" }, 404, h);
  const obj = await env.DATA.get(key, { onlyIf: request.headers });
  if (!obj) return json({ error: "not found" }, 404, h);
  const headers = {
    ...h,
    "Content-Type": obj.httpMetadata?.contentType ?? "application/json; charset=utf-8",
    "Cache-Control": obj.httpMetadata?.cacheControl ?? DATA_CACHE,
    ETag: obj.httpEtag,
  };
  if (!("body" in obj) || !obj.body) return new Response(null, { status: 304, headers }); // If-None-Match 일치
  return new Response(request.method === "HEAD" ? null : obj.body, { status: 200, headers });
}

// ── 2. Update 버튼 ──
async function rateLimit(env, key, limit, windowSec) {
  const cur = +(await env.RATE.get(key)) || 0;
  if (cur >= limit) return false;
  await env.RATE.put(key, String(cur + 1), { expirationTtl: windowSec });
  return true;
}

/** 캐시에 없는 아이템만 공식 API로 아이콘·displayId (Wowhead는 매시간 수집기에서만) — 서브요청 예산 보호 */
async function resolveItemsLight(ids, items, bnet, max = 8) {
  const sns = NS.static(bnet.region);
  const need = [...new Set(ids)].filter((id) => !items[id]).slice(0, max);
  await Promise.all(need.map(async (id) => {
    const [media, item] = await Promise.all([bnet.get(`/data/wow/media/item/${id}`, sns), bnet.get(`/data/wow/item/${id}`, sns)]);
    let displayId = null;
    const appId = item.data?.appearances?.[0]?.id;
    if (appId) displayId = (await bnet.get(`/data/wow/item-appearance/${appId}`, sns)).data?.item_display_info_id ?? null;
    items[id] = { icon: media.data?.assets?.find((a) => a.key === "icon")?.value ?? null, displayId, src: displayId ? "blizzard" : "none", at: Date.now() };
  }));
  return need.length;
}

async function handleRefresh(request, env, url, h) {
  const slug = (url.searchParams.get("c") ?? "").trim();
  if (!slug) return json({ error: "c(slug) 필요" }, 400, h);

  // 길드원만 허용
  const index = await (await env.DATA.get("index.json"))?.json();
  const mi = index?.members.findIndex((m) => m.slug === slug) ?? -1;
  if (mi < 0) return json({ error: "길드원이 아닙니다" }, 404, h);
  const member = index.members[mi];

  // 남용 방지: 캐릭터당 쿨다운, IP당 시간당 횟수
  const cooldown = +(env.REFRESH_COOLDOWN_SEC ?? 600);
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const last = +(await env.RATE.get(`cd:${member.id}`)) || 0;
  const remain = Math.ceil((last + cooldown * 1000 - Date.now()) / 1000);
  if (remain > 0) return json({ error: "cooldown", retryAfter: remain }, 429, { ...h, "Retry-After": String(remain) });
  if (!(await rateLimit(env, `ip:${ip}`, +(env.REFRESH_IP_PER_HOUR ?? 20), 3600))) return json({ error: "too many" }, 429, h);
  await env.RATE.put(`cd:${member.id}`, String(Date.now()), { expirationTtl: Math.max(60, cooldown) });

  // Blizzard 조회 (프로필 + 5종 = 7요청 + 토큰)
  const bnet = createBnet({ clientId: env.BLIZZARD_CLIENT_ID, clientSecret: env.BLIZZARD_CLIENT_SECRET, region: env.REGION ?? "kr", concurrency: 6 });
  const { status, raw } = await fetchCharacterRaw(bnet, slug);
  if (status !== 200) return json({ error: "blizzard", status, hint: "로그아웃 후 반영 / 10레벨 이상" }, status === 404 ? 404 : 502, h);

  const items = (await (await env.DATA.get("state/items.json"))?.json()) ?? {};
  const added = await resolveItemsLight(equippedItemIds(raw.equipment), items, bnet);

  const collectedAt = new Date().toISOString();
  const c = buildCharacter(raw, { rank: member.rank, items, slug });
  const charBody = { collectedAt, ...c };

  // R2 갱신: chars / index 항목 / state(아이템 캐시·lastLogin)
  const meta = (await (await env.DATA.get("state/meta.json"))?.json()) ?? { chars: {} };
  meta.chars[c.id] = c.lastLogin;
  index.members[mi] = indexEntry(member, c);
  const put = (key, obj, cacheControl) =>
    env.DATA.put(key, JSON.stringify(obj), { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl } });
  await Promise.all([
    put(`chars/${c.id}.json`, charBody, DATA_CACHE),
    put("index.json", index, DATA_CACHE),
    put("state/meta.json", meta, "no-store"),
    added ? put("state/items.json", items, "no-store") : null,
  ]);

  return json({ ok: true, character: charBody, requests: bnet.stats.requests }, 200, { ...h, "Cache-Control": "no-store" });
}

// ── 수집기 업로드 (GitHub Actions) ──
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function handleIngest(request, env, key) {
  const auth = request.headers.get("Authorization") ?? "";
  if (!env.INGEST_TOKEN || !safeEqual(auth, `Bearer ${env.INGEST_TOKEN}`)) return json({ error: "unauthorized" }, 401, {});
  if (!key || key.includes("..") || !/^(index\.json|rank\.json|chars\/\d+\.json|talents\/\d+\.json|state\/[a-z]+\.json)$/.test(key)) return json({ error: "bad key" }, 400, {});
  if (request.method === "GET") {
    const o = await env.DATA.get(key);
    return o ? new Response(o.body, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }) : json({ error: "not found" }, 404, {});
  }
  const body = await request.text();
  try { JSON.parse(body); } catch { return json({ error: "invalid json" }, 400, {}); }
  const cacheControl = request.headers.get("X-Cache-Control") ?? (key.startsWith("state/") ? "no-store" : DATA_CACHE);
  await env.DATA.put(key, body, { httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl } });
  return json({ ok: true, key, bytes: body.length }, 200, {});
}

// ── 3. 3D 모델 프록시 ──
async function handleModel(request, env, ctx, path, h) {
  const isHead = request.method === "HEAD";
  const r2Key = `modelviewer/${path}`;
  const ct = (p) => (p.endsWith(".json") ? "application/json" : p.endsWith(".webp") ? "image/webp" : p.endsWith(".png") ? "image/png" : "application/octet-stream");
  const longCache = "public, max-age=604800, immutable";

  const hit = await env.MODEL_CACHE.get(r2Key);
  if (hit) return new Response(isHead ? null : hit.body, { headers: { ...h, "Content-Type": hit.httpMetadata?.contentType ?? ct(path), "Cache-Control": longCache, "X-Source": "r2" } });

  const target = `${ZAMIMG}/${r2Key}`;
  const cached = await caches.default.match(target);
  if (cached) return new Response(isHead ? null : cached.body, { headers: { ...h, "Content-Type": cached.headers.get("Content-Type") ?? ct(path), "Cache-Control": longCache, "X-Source": "edge" } });

  const up = await fetch(target, { method: isHead ? "HEAD" : "GET", headers: ZAM_HEADERS });
  if (!up.ok) return new Response("Not Found", { status: 404, headers: h });
  const contentType = up.headers.get("Content-Type") ?? ct(path);
  const body = isHead ? null : await up.arrayBuffer();
  const res = new Response(body, { headers: { ...h, "Content-Type": contentType, "Cache-Control": longCache, "X-Source": "zamimg" } });
  if (body) {
    ctx.waitUntil(Promise.all([
      caches.default.put(target, new Response(body.slice(0), { headers: { "Content-Type": contentType, "Cache-Control": longCache } })),
      env.MODEL_CACHE.put(r2Key, body.slice(0), { httpMetadata: { contentType } }),
    ]));
  }
  return res;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const h = cors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    try {
      const p = decodeURIComponent(url.pathname);
      if (p.startsWith("/forever/data/") && (request.method === "GET" || request.method === "HEAD")) return await handleData(request, env, p.slice("/forever/data/".length), h);
      if (p === "/forever/refresh" && request.method === "POST") return await handleRefresh(request, env, url, h);
      if (p.startsWith("/mv/") && (request.method === "GET" || request.method === "HEAD")) return await handleModel(request, env, ctx, p.slice(4), h);
      if (p.startsWith("/forever/ingest/") && (request.method === "GET" || request.method === "PUT")) return await handleIngest(request, env, p.slice("/forever/ingest/".length));
      if (p === "/" || p === "/health") return json({ ok: true, service: "wow-forever" }, 200, h);
      return json({ error: "not found" }, 404, h);
    } catch (e) {
      return json({ error: "internal", message: String(e?.message ?? e) }, 500, h);
    }
  },
};
