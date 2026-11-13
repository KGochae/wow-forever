// 레이드 구성 — 특성·역할 정의 + 시너지 계산
// 시너지 목록(38개)은 raid-synergy-data.ts (WOW Forever 기준)
import { RAID_SYNERGIES } from "./raid-synergy-data";
import type { Member } from "./wow";

export type Role = "tank" | "healer" | "physical" | "caster";
export type Scope = "raid" | "party";

export interface SynergyProvider {
  classId: number;
  /** 필요한 특성 (없으면 직업만 맞으면 됨) — 우리 데이터의 특성 이름(무기·야성…)과 같음 */
  spec?: string;
  name: string;
  icon: string;
  scope: Scope;
  /** 같은 사람이 하나만 걸 수 있는 묶음 (축복·바람 토템·저주) — slot번째 제공자부터 가능 */
  share?: string;
  slot?: number;
  desc: string;
}
export interface RaidSynergy {
  id: string;
  cat: CatId;
  /** 핵심 버프 (부족 표시 대상) */
  core: boolean;
  /** 여러 스킬이 같은 효과일 때 묶음 이름 (없으면 첫 스킬 이름) */
  label?: string;
  providers: SynergyProvider[];
}

export type CatId = "physical" | "caster" | "survival" | "debuff" | "utility" | "resist";
export const CATS: { id: CatId; label: string }[] = [
  { id: "physical", label: "물리 딜" },
  { id: "caster", label: "주문 · 마나" },
  { id: "survival", label: "생존" },
  { id: "debuff", label: "적 약화" },
  { id: "utility", label: "해제 · 지원" },
  { id: "resist", label: "저항" },
];
/** 다른 분류에도 같이 보일 항목 (치명타·극대화율 → 주문·마나에도) */
const ALSO_IN: Record<string, CatId[]> = { crit: ["caster"] };
export const synergiesOf = (cat: CatId) => RAID_SYNERGIES.filter((s) => s.cat === cat || ALSO_IN[s.id]?.includes(cat));
export const synergyTitle = (s: RaidSynergy) => s.label ?? s.providers[0].name;
export { RAID_SYNERGIES };

// ── 역할 ──
export const ROLE_INFO: Record<Role, { label: string; short: string; color: string }> = {
  tank: { label: "탱커", short: "탱", color: "#7fb2ff" },
  healer: { label: "힐러", short: "힐", color: "#7ee0a1" },
  physical: { label: "물리 딜러", short: "물리", color: "#ffb36b" },
  caster: { label: "주문 딜러", short: "주문", color: "#c9a2ff" },
};
export const ROLES: Role[] = ["tank", "healer", "physical", "caster"];

/** 화면 표시용 역할 (WEB_PROJECT 딜러·힐러·탱커) — 물리·주문 딜러는 "딜러"로 묶음 */
export type RoleGroup = "dps" | "healer" | "tank";
export const ROLE_GROUPS: RoleGroup[] = ["dps", "healer", "tank"];
export const ROLE_GROUP_INFO: Record<RoleGroup, { label: string; short: string; color: string }> = {
  dps: { label: "딜러", short: "딜", color: "#d4918e" },
  healer: { label: "힐러", short: "힐", color: "#7bb899" },
  tank: { label: "탱커", short: "탱", color: "#7a9fd4" },
};
export const roleGroup = (r?: Role): RoleGroup | undefined => (r === "physical" || r === "caster" ? "dps" : r);

/** 직업별 특성 선택지 (드루이드 야성은 딜러·탱커로 나눔) */
export interface SpecOption { key: string; spec: string; label: string; role: Role }
const o = (key: string, spec: string, role: Role, label = spec): SpecOption => ({ key, spec, label, role });
export const SPEC_OPTIONS: Record<number, SpecOption[]> = {
  1: [o("arms", "무기", "physical"), o("fury", "분노", "physical"), o("prot", "방어", "tank")],
  2: [o("holy", "신성", "healer"), o("prot", "보호", "tank"), o("ret", "징벌", "physical")],
  3: [o("bm", "야수", "physical"), o("mm", "사격", "physical"), o("surv", "생존", "physical")],
  4: [o("assa", "암살", "physical"), o("combat", "전투", "physical"), o("sub", "잠행", "physical")],
  5: [o("disc", "수양", "healer"), o("holy", "신성", "healer"), o("shadow", "암흑", "caster")],
  7: [o("ele", "정기", "caster"), o("enh", "고양", "physical"), o("resto", "복원", "healer")],
  8: [o("arcane", "비전", "caster"), o("fire", "화염", "caster"), o("frost", "냉기", "caster")],
  9: [o("aff", "고통", "caster"), o("demo", "악마", "caster"), o("destro", "파괴", "caster")],
  11: [o("balance", "조화", "caster"), o("feral", "야성", "physical", "야성딜"), o("bear", "야성", "tank", "야성탱"), o("resto", "회복", "healer")],
};
export const specOption = (classId: number, key?: string | null) => SPEC_OPTIONS[classId]?.find((s) => s.key === key);
/** 수집된 대표 특성 → 기본 선택지 (모르면 undefined) */
export const defaultSpecKey = (m: Pick<Member, "classId" | "spec">) => SPEC_OPTIONS[m.classId]?.find((s) => s.spec === m.spec)?.key;

/** 직업 아이콘 (zamimg) */
const CLASS_EN: Record<number, string> = { 1: "warrior", 2: "paladin", 3: "hunter", 4: "rogue", 5: "priest", 7: "shaman", 8: "mage", 9: "warlock", 11: "druid" };
export const classIcon = (classId: number) => `https://wow.zamimg.com/images/wow/icons/medium/classicon_${CLASS_EN[classId] ?? "warrior"}.jpg`;

// ── 계산 ──
export interface RaidSlot { member: Member; specKey?: string }
export type Groups = (RaidSlot | null)[][];

export const GROUPS = 5;
export const GROUP_SIZE = 5;
export const RAID_SIZE = GROUPS * GROUP_SIZE;

export function slotRole(s: RaidSlot): Role | undefined {
  return specOption(s.member.classId, s.specKey)?.role;
}

const providesFor = (p: SynergyProvider, s: RaidSlot) =>
  s.member.classId === p.classId && (!p.spec || specOption(s.member.classId, s.specKey)?.spec === p.spec);

export interface SynergyState {
  synergy: RaidSynergy;
  /** raid: 공대 전체 / party: 일부 파티만 / none: 없음 */
  status: "raid" | "party" | "none";
  /** 효과를 받는 파티 (0부터) */
  groups: number[];
  /** 실제로 효과를 주는 스킬별 제공자 */
  sources: { provider: SynergyProvider; members: Member[] }[];
}

/**
 * 시너지 판정
 * - scope raid: 공대 안에 제공자가 slot명 이상 있으면 공대 전체
 * - scope party: 제공자가 있는 파티만 (공유 묶음이면 그 파티 안에서 slot명 이상)
 */
export function evaluate(groups: Groups): Map<string, SynergyState> {
  const res = new Map<string, SynergyState>();
  const all = groups.flat().filter(Boolean) as RaidSlot[];
  for (const syn of RAID_SYNERGIES) {
    const covered = new Set<number>();
    let raidWide = false;
    const sources: SynergyState["sources"] = [];
    for (const p of syn.providers) {
      const need = p.slot ?? 1;
      if (p.scope === "raid") {
        const ms = all.filter((s) => providesFor(p, s)).map((s) => s.member);
        if (ms.length >= need) { raidWide = true; sources.push({ provider: p, members: ms }); }
      } else {
        const ms: Member[] = [];
        groups.forEach((g, gi) => {
          const inG = (g.filter(Boolean) as RaidSlot[]).filter((s) => providesFor(p, s));
          if (inG.length >= need) { covered.add(gi); ms.push(...inG.map((s) => s.member)); }
        });
        if (ms.length) sources.push({ provider: p, members: ms });
      }
    }
    const filledGroups = groups.map((g, i) => (g.some(Boolean) ? i : -1)).filter((i) => i >= 0);
    res.set(syn.id, {
      synergy: syn,
      status: raidWide ? "raid" : covered.size ? "party" : "none",
      groups: raidWide ? filledGroups : [...covered].sort((a, b) => a - b),
      sources,
    });
  }
  return res;
}

export const spellIcon = (icon: string, size: "small" | "medium" | "large" = "medium") =>
  `https://wow.zamimg.com/images/wow/icons/${size}/${icon}.jpg`;
