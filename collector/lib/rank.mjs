// 리더보드용 rank.json — 전 캐릭터의 최종수치(*_effective 등) 22종만 압축 저장
//   { collectedAt, keys: [...], rows: [[id, v1, v2, ...]] }   (값 순서 = keys, 없으면 null)
//   이름·직업·레벨·특성은 index.json 과 id로 합쳐서 사용 (중복 저장 안 함)
export const RANK_KEYS = [
  "strength_effective", "agility_effective", "intellect_effective", "stamina_effective", "spirit_effective",
  "health", "power", "armor_effective", "defense_effective", "dodge", "parry", "block",
  "attack_power", "main_hand_dps", "off_hand_dps", "melee_crit",
  "ranged_attack_power", "ranged_crit",
  "spell_power", "spell_healing", "spell_crit", "mana_regen",
];

const round = (v) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
export const rankRow = (c) => [c.id, ...RANK_KEYS.map((k) => round(c.stats?.[k]))];

/**
 * rank.json 생성
 * - built: 이번에 새로 수집한 캐릭터 (Map id → character)
 * - 나머지: 이전 rank.json 행 재사용 → 없으면(첫 실행 등) chars/{id}.json 에서 1회 읽어 채움
 */
export async function buildRank(store, memberIds, built, collectedAt, { log = () => {} } = {}) {
  const prev = await store.getJSON("rank.json");
  const sameKeys = prev?.keys?.join() === RANK_KEYS.join();
  const prevRows = new Map(sameKeys ? prev.rows.map((r) => [r[0], r]) : []);
  const rows = [];
  let loaded = 0;
  for (const id of memberIds) {
    const c = built.get(id);
    if (c) { rows.push(rankRow(c)); continue; }
    const p = prevRows.get(id);
    if (p) { rows.push(p); continue; }
    const file = await store.getJSON(`chars/${id}.json`);
    if (file?.stats) { rows.push(rankRow(file)); loaded++; }
  }
  if (loaded) log(`   rank: 이전 행 없음 → chars/ ${loaded}개 읽어 채움`);
  return { collectedAt, keys: RANK_KEYS, rows };
}
