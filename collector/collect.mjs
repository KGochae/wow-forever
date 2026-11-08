// 길드 수집기 (매시간 GitHub Actions / 로컬 개발 공용)
//
//   npm run collect            → .env.local 로 실행 (기본 STORAGE=local → public/data)
//   FORCE=1 npm run collect    → 변경 여부 무시하고 전원 재수집
//
// 저장 구조 (storage 루트 기준)
//   index.json            사이드바·검색 (길드원 전체, 경량)
//   chars/{id}.json       캐릭터 상세
//   talents/{classId}.json 특성 트리 (static 버전 바뀔 때만)
//   state/meta.json       { staticVersion, lastRun, chars: { [id]: lastLogin } }
//   state/items.json      아이템 아이콘·displayId 영구 캐시
//
// 증분 수집: roster + 프로필(1요청/인) → last_login_timestamp 가 바뀐 캐릭터만 하위 5종 재조회
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBnet, NS } from "./lib/bnet.mjs";
import { buildCharacter, equippedItemIds, indexEntry, staticVersion, SUB_ENDPOINTS } from "./lib/transform.mjs";
import { resolveItems } from "./lib/items.mjs";
import { buildAllTalents } from "./lib/talents.mjs";
import { CACHE, createStorage } from "./lib/storage.mjs";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;
const GUILD = env.GUILD_SLUG ?? "같이와포하자";
const FORCE = !!env.FORCE && env.FORCE !== "0";
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

const bnet = createBnet({ clientId: env.BLIZZARD_CLIENT_ID, clientSecret: env.BLIZZARD_CLIENT_SECRET, region: env.REGION ?? "kr" });
const store = await createStorage(env);
log(`저장소 ${store.root} · 길드 ${GUILD}${FORCE ? " · FORCE" : ""}`);

// ── 이전 상태 ──
const meta = (await store.getJSON("state/meta.json")) ?? { staticVersion: null, chars: {} };
const items = (await store.getJSON("state/items.json"))
  ?? JSON.parse(fs.readFileSync(path.join(DIR, "seed", "items.json"), "utf8")); // 첫 실행: 시드 캐시
const prevIndex = await store.getJSON("index.json");
const prevById = new Map((prevIndex?.members ?? []).map((m) => [m.id, m]));

// ── 1. 길드 목록 ──
const rs = await bnet.get(`/data/wow/guild/${GUILD}/roster`, NS.profile(bnet.region));
if (rs.status !== 200) throw new Error(`roster 실패 ${rs.status}`);
const members = rs.data.members.map((m) => ({
  id: m.character.id, name: m.character.name, surname: m.character.surname, slug: m.character.slug,
  level: m.character.level, classId: m.character.playable_class.id, raceId: m.character.playable_race.id, rank: m.rank,
}));
log(`1. 길드원 ${members.length}명`);

// ── 2. 프로필 (1요청/인) → 변경 판단 ──
const profiles = new Map();
await Promise.all(members.map(async (m) => {
  const r = await bnet.get(`/profile/wow/character/${m.slug}`, NS.profile(bnet.region));
  if (r.status === 200) profiles.set(m.id, r.data);
}));
const changed = members.filter((m) => {
  const p = profiles.get(m.id);
  return p && (FORCE || meta.chars[m.id] !== p.last_login_timestamp || !prevById.get(m.id)?.has);
});
log(`2. 프로필 ${profiles.size}/${members.length} · 변경 ${changed.length}명`);

// ── 3. 변경된 캐릭터만 하위 5종 ──
const raws = new Map();
await Promise.all(changed.map(async (m) => {
  const base = `/profile/wow/character/${m.slug}`;
  const subs = await Promise.all(SUB_ENDPOINTS.map((x) => bnet.get(`${base}/${x}`, NS.profile(bnet.region))));
  const [equipment, statistics, specializations, media, appearance] = subs.map((r) => r.data);
  raws.set(m.id, { profile: profiles.get(m.id), equipment, statistics, specializations, media, appearance });
}));
log(`3. 상세 ${raws.size}명 조회`);

// ── 4. 아이템 아이콘·displayId (캐시에 없는 것만) ──
const itemIds = [...raws.values()].flatMap((r) => equippedItemIds(r.equipment));
const ir = await resolveItems(itemIds, items, bnet, { log });
log(`4. 아이템 신규 확인 ${ir.checked} (공식 ${ir.blizzard} · Wowhead ${ir.wowhead} · 미확보 ${ir.none}) · 캐시 ${Object.keys(items).length}`);

// ── 5. 캐릭터 파일 저장 ──
const collectedAt = new Date().toISOString();
const built = new Map();
for (const m of changed) {
  const c = buildCharacter(raws.get(m.id), { rank: m.rank, items, slug: m.slug });
  built.set(m.id, c);
  meta.chars[m.id] = c.lastLogin;
}
// 업로드 동시 8개 (순차 대비 약 6~8배 빠름)
const queue = [...built.values()];
await Promise.all(Array.from({ length: 8 }, async () => {
  for (let c; (c = queue.shift()); ) await store.putJSON(`chars/${c.id}.json`, { collectedAt, ...c }, { cacheControl: CACHE.data });
}));
log(`5. chars/ ${built.size}개 저장`);

// ── 6. 특성 트리 (static 버전 변경 시) ──
const anyProfile = profiles.values().next().value;
const ver = staticVersion(anyProfile);
if (FORCE || !meta.staticVersion || meta.staticVersion !== ver) {
  const trees = await buildAllTalents(bnet, { log });
  for (const [cls, t] of Object.entries(trees)) await store.putJSON(`talents/${cls}.json`, t, { cacheControl: CACHE.static });
  log(`6. 특성 트리 갱신 (static ${meta.staticVersion} → ${ver})`);
  meta.staticVersion = ver;
} else log(`6. 특성 트리 유지 (static ${ver})`);

// ── 7. index.json (변경 없는 캐릭터는 이전 항목 유지, 레벨은 프로필 최신값) ──
const index = {
  guild: { name: rs.data.guild.name, id: rs.data.guild.id, faction: rs.data.guild.faction?.name },
  collectedAt,
  members: members.map((m) => {
    const c = built.get(m.id);
    if (c) return indexEntry(m, c);
    const prev = prevById.get(m.id);
    const p = profiles.get(m.id);
    if (prev?.has) return { ...prev, level: p?.level ?? prev.level, rank: m.rank, name: m.name, surname: m.surname, slug: m.slug };
    return indexEntry(m, null);
  }),
};
await store.putJSON("index.json", index, { cacheControl: CACHE.data });

// ── 8. 상태 저장 ──
meta.lastRun = collectedAt;
meta.lastStats = { members: members.length, profiles: profiles.size, changed: changed.length, requests: bnet.stats.requests };
await store.putJSON("state/items.json", items, { cacheControl: CACHE.state });
await store.putJSON("state/meta.json", meta, { cacheControl: CACHE.state });

const has = index.members.filter((m) => m.has).length;
log(`완료 — 상세 보유 ${has}/${members.length} · Blizzard 요청 ${bnet.stats.requests} (재시도 ${bnet.stats.retries}) · 상태코드`, bnet.stats.byStatus);

