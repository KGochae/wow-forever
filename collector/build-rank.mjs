// rank.json 만 다시 만들기 (Blizzard 요청 없음) — 첫 배포 시드 / 로컬 테스트용
//   node --env-file-if-exists=.env.local collector/build-rank.mjs         (STORAGE 기본 local → public/data)
import { buildRank } from "./lib/rank.mjs";
import { CACHE, createStorage } from "./lib/storage.mjs";

const store = await createStorage(process.env);
const index = await store.getJSON("index.json");
if (!index) throw new Error("index.json 없음 — 먼저 수집기를 실행하세요");
const ids = index.members.filter((m) => m.has).map((m) => m.id);
const rank = await buildRank(store, ids, new Map(), index.collectedAt, { log: console.log });
await store.putJSON("rank.json", rank, { cacheControl: CACHE.data });
console.log(`rank.json 저장 — ${rank.rows.length}명 · ${JSON.stringify(rank).length}바이트 · ${store.root}`);
