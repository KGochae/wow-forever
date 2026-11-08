// 능력치 표시 설정 — WEB_PROJECT js/constants.js CLASS_KEY_STATS 기반 (Forever statistics 키로 매핑)
// 키 규칙: base/effective 분리 스탯은 `${key}_effective` / `${key}_base`

export type Fmt = "int" | "pct" | "dps" | "dec";
export interface StatDef { k: string; l: string; c: string; f?: Fmt; baseKey?: string }

const S = {
  health: { k: "health", l: "생명력", c: "#e25822" },
  power: { k: "power", l: "자원", c: "#5588cc" },
  ap: { k: "attack_power", l: "전투력", c: "#e8b84b" },
  rap: { k: "ranged_attack_power", l: "원거리 전투력", c: "#c8b04b" },
  mhDps: { k: "main_hand_dps", l: "주무기 DPS", c: "#ffaa44", f: "dps" },
  ohDps: { k: "off_hand_dps", l: "보조무기 DPS", c: "#ddaa33", f: "dps" },
  str: { k: "strength_effective", baseKey: "strength_base", l: "힘", c: "#c8961e" },
  agi: { k: "agility_effective", baseKey: "agility_base", l: "민첩성", c: "#aad372" },
  sta: { k: "stamina_effective", baseKey: "stamina_base", l: "체력", c: "#e2a05a" },
  int: { k: "intellect_effective", baseKey: "intellect_base", l: "지능", c: "#69ccf0" },
  spi: { k: "spirit_effective", baseKey: "spirit_base", l: "정신력", c: "#88aacc" },
  armor: { k: "armor_effective", baseKey: "armor_base", l: "방어도", c: "#a0a0b0" },
  defense: { k: "defense_effective", baseKey: "defense_base", l: "방어숙련", c: "#7eb8d4" },
  mCrit: { k: "melee_crit", l: "근접 치명타", c: "#ff6b35", f: "pct" },
  mHaste: { k: "melee_haste", l: "근접 가속", c: "#ff9a6b", f: "pct" },
  mHit: { k: "melee_hit", l: "근접 적중", c: "#ffc56b", f: "pct" },
  ohHit: { k: "off_hand_hit", l: "보조무기 적중", c: "#e8b86b", f: "pct" },
  exp: { k: "expertise", l: "숙련", c: "#d4a86b" },
  arp: { k: "armor_penetration", l: "방어구 관통", c: "#c08860" },
  rCrit: { k: "ranged_crit", l: "원거리 치명타", c: "#7ec8a0", f: "pct" },
  rHaste: { k: "ranged_haste", l: "원거리 가속", c: "#88ccee", f: "pct" },
  rHit: { k: "ranged_hit", l: "원거리 적중", c: "#9ed4b0", f: "pct" },
  sp: { k: "spell_power", l: "주문력", c: "#88ccff" },
  heal: { k: "spell_healing", l: "치유량", c: "#55ddaa" },
  sCrit: { k: "spell_crit", l: "주문 치명타", c: "#aaddff", f: "pct" },
  sHaste: { k: "spell_haste", l: "주문 가속", c: "#66aaff", f: "pct" },
  sHit: { k: "spell_hit", l: "주문 적중", c: "#99bbff", f: "pct" },
  sPen: { k: "spell_penetration", l: "주문 관통", c: "#cc88ff" },
  mp5: { k: "mana_regen", l: "마나 재생/5초", c: "#88aadd" },
  mp5c: { k: "mana_regen_combat", l: "전투 마나 재생", c: "#66aacc" },
  dodge: { k: "dodge", l: "회피", c: "#88ccaa", f: "pct" },
  parry: { k: "parry", l: "무기 막기", c: "#aaccee", f: "pct" },
  block: { k: "block", l: "방패 막기", c: "#ccaaee", f: "pct" },
  avoid: { k: "avoidance", l: "광역 회피", c: "#9fb8c8", f: "pct" },
  bArmor: { k: "bonus_armor", l: "추가 방어도", c: "#8f8fa0" },
  speed: { k: "movement_speed", l: "이동 속도", c: "#b8c8d8", f: "pct" },
  fire: { k: "fire_resistance_effective", baseKey: "fire_resistance_base", l: "화염 저항", c: "#ff6030" },
  frost: { k: "frost_resistance_effective", baseKey: "frost_resistance_base", l: "냉기 저항", c: "#69ccf0" },
  nature: { k: "nature_resistance_effective", baseKey: "nature_resistance_base", l: "자연 저항", c: "#5ab87a" },
  shadow: { k: "shadow_resistance_effective", baseKey: "shadow_resistance_base", l: "암흑 저항", c: "#9482c9" },
  arcane: { k: "arcane_resistance_effective", baseKey: "arcane_resistance_base", l: "비전 저항", c: "#d8b4fe" },
} satisfies Record<string, StatDef>;

/** 직업별 핵심 능력치 (WEB_PROJECT CLASS_KEY_STATS) — classId 키 */
export const CLASS_KEY_STATS: Record<number, StatDef[]> = {
  1: [S.health, S.ap, S.mhDps, S.str, S.mCrit, S.mHit, S.armor, S.defense, S.dodge, S.parry, S.block],
  2: [S.health, S.ap, S.mhDps, S.sp, S.heal, S.str, S.int, S.mCrit, S.sCrit, S.mp5, S.armor, S.defense, S.dodge, S.parry, S.block],
  3: [S.health, S.rap, S.ap, S.mhDps, S.agi, S.rCrit, S.rHit, S.rHaste, S.int, S.mp5, S.power],
  4: [S.health, S.ap, S.mhDps, S.ohDps, S.agi, S.mCrit, S.mHit, S.rCrit, S.dodge],
  5: [S.health, S.power, S.sp, S.heal, S.int, S.spi, S.sCrit, S.sHit, S.mp5, S.mp5c],
  7: [S.health, S.power, S.sp, S.heal, S.ap, S.mhDps, S.int, S.sCrit, S.mCrit, S.mp5],
  8: [S.health, S.power, S.sp, S.int, S.spi, S.sCrit, S.sHit, S.sHaste, S.sPen, S.mp5],
  9: [S.health, S.power, S.sp, S.int, S.spi, S.sCrit, S.sHit, S.sPen, S.mp5],
  11: [S.health, S.power, S.sp, S.heal, S.ap, S.mhDps, S.agi, S.spi, S.sCrit, S.armor, S.mp5, S.dodge],
};

/** 다른 능력치 보기 — 좌우로 넘기는 페이지 */
export interface StatPage { key: string; title: string; defs: StatDef[]; baseToggle?: boolean }
export const statPages = (classId: number): StatPage[] => [
  { key: "core", title: "핵심 능력치", defs: CLASS_KEY_STATS[classId] ?? CLASS_KEY_STATS[1] },
  { key: "primary", title: "주 능력치", defs: [S.str, S.agi, S.sta, S.int, S.spi, S.armor, S.defense], baseToggle: true },
  { key: "melee", title: "근접 · 원거리", defs: [S.ap, S.mhDps, S.ohDps, S.mCrit, S.mHaste, S.mHit, S.ohHit, S.exp, S.arp, S.rap, S.rCrit, S.rHaste, S.rHit] },
  { key: "spell", title: "주문", defs: [S.sp, S.heal, S.sCrit, S.sHaste, S.sHit, S.sPen, S.mp5, S.mp5c] },
  { key: "defense", title: "방어", defs: [S.health, S.armor, S.bArmor, S.defense, S.dodge, S.parry, S.block, S.avoid, S.speed] },
  { key: "resist", title: "저항", defs: [S.fire, S.frost, S.nature, S.shadow, S.arcane], baseToggle: true },
];

export const STAT = S;

export function fmtStat(v: number | null | undefined, f?: Fmt) {
  if (v == null || Number.isNaN(v)) return "—";
  if (f === "pct") return `${v.toFixed(1)}%`;
  if (f === "dps" || f === "dec") return v.toFixed(1);
  return Math.round(v).toLocaleString("ko-KR");
}
