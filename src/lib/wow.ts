// WoW Forever 공통 상수 · 타입

// 직업 고유 색상 — WEB_PROJECT js/constants.js CLASS_COLOR
export const CLASS_INFO: Record<number, { name: string; color: string }> = {
  1: { name: "전사", color: "#c69b3a" },
  2: { name: "성기사", color: "#f48cba" },
  3: { name: "사냥꾼", color: "#aad372" },
  4: { name: "도적", color: "#fff468" },
  5: { name: "사제", color: "#c2d6e8" },
  7: { name: "주술사", color: "#2090e0" },
  8: { name: "마법사", color: "#69ccf0" },
  9: { name: "흑마법사", color: "#9482c9" },
  11: { name: "드루이드", color: "#ff7c0a" },
};

/** 직업 id 정렬 — 한글 이름순 (모든 직업 필터 공통) */
export const byClassName = (a: number, b: number) =>
  (CLASS_INFO[a]?.name ?? String(a)).localeCompare(CLASS_INFO[b]?.name ?? String(b), "ko");
export const classColor = (id?: number) => (id != null && CLASS_INFO[id]?.color) || "#a0a0a0";

export const RACE_NAME: Record<number, string> = {
  1: "인간", 2: "오크", 3: "드워프", 4: "나이트엘프",
  5: "언데드", 6: "타우렌", 7: "노움", 8: "트롤",
  95: "스카이본", // API: "고등 마법원 스카이본"
};

// 길드 등급 이름은 API에 없음 → 숫자 등급 표시 (추후 매핑)
/** 길드 등급 이름 (블리자드 API는 등급 번호만 줌 → 여기서 이름 지정, 없으면 "등급 N") */
export const RANK_NAMES: Record<number, string> = { 0: "길드장", 1: "스텝", 2: "L70", 3: "L60" };
export const RANK_LABEL = (rank: number) => RANK_NAMES[rank] ?? `등급 ${rank}`;
/** 등급 선택 시 색 (레거시 등급만 · 없으면 기본 흰색 선택 표시) */
export const RANK_COLOR: Record<number, string> = { 2: "#9be06a", 3: "#e0b85c" };

export const QUALITY_COLOR: Record<string, string> = {
  POOR: "#9d9d9d", COMMON: "#ffffff", UNCOMMON: "#1eff00",
  RARE: "#0070dd", EPIC: "#a335ee", LEGENDARY: "#ff8000",
};

/** 아이콘: 공식 API 전체 URL(render.worldofwarcraft.com)은 그대로, 아이콘 이름이면 zamimg */
export const iconUrl = (icon?: string | null, size: "medium" | "large" = "large") =>
  !icon ? "" : icon.startsWith("http") ? icon : `https://wow.zamimg.com/images/wow/icons/${size}/${icon}.jpg`;

export interface Member {
  id: number;
  name: string;
  surname: string;
  slug: string;
  level: number;
  classId: number;
  raceId: number;
  rank: number;
  avatar?: string | null; // index.json (사이드바용 경량 데이터)
  spec?: string | null;   // 대표 특성 (포인트 최다)
  has?: boolean;          // 상세 데이터(chars/{id}.json) 존재 여부
  streamer?: { name: string; soop: string } | null; // 스트리머 (avatar = 스트리머 사진)
}

export interface EquipItem {
  slot: string;
  slotName: string;
  itemId: number;
  name: string;
  quality: string;
  ilvl?: number;
  subclass?: string | null;
  inventoryType?: string;
  binding?: string | null;
  icon?: string | null;
  armor?: number | null;
  weapon?: { min: number | null; max: number | null; damageType?: string | null; speed: number | null; dps: number | null } | null;
  displayId?: number | null;
  stats: string[];
  enchants?: string[];
  requiredLevel?: number | null;
  durability?: number | null;
  sellPrice?: number | null;
}

/** 특성 트리 (static-forever talent-tree) */
export interface TalentNode {
  nodeId: number;
  row: number;      // 1~7
  col: number;      // 0~3
  talentId: number | null;
  name: string;
  nameKoMissing?: boolean;
  spellId: number | null;
  icon: string | null;
  maxRank: number;
  castTime: string | null;
  ranks: string[];  // 랭크별 설명
  lockedBy: number[];
  unlocks: number[];
}
export interface TalentSpecTree { name: string; specId: number; nodes: TalentNode[] }
export interface ClassTalents { classId: number; treeId: number; specs: TalentSpecTree[] }
export interface CharTalentSpec { specId: number; specName: string; points: number; picks: { talentId: number; rank: number }[] }

export const copper = (c: number) => {
  const g = Math.floor(c / 10000), s = Math.floor((c % 10000) / 100), cp = c % 100;
  return { g, s, c: cp };
};

/** statistics 평탄화: value형은 숫자, base/effective형은 `${k}_base` / `${k}_effective`, power_type은 문자열 */
export type FlatStats = Record<string, number | string | null>;
export const num = (s: FlatStats | null | undefined, k: string): number | null => {
  const v = s?.[k];
  return typeof v === "number" ? v : null;
};

export interface CharacterDetail {
  id: number;
  name: string;
  surname: string;
  slug: string;
  level: number;
  classId: number;
  className: string;
  raceId: number;
  raceName: string;
  gender: { type: string; name: string };
  faction: { type: string; name: string };
  guild?: string;
  ilvl: number;
  avgIlvl: number;
  lastLogin: number;
  avatar: string;
  render: string;
  spec: { name: string; points: number }[];
  talents?: CharTalentSpec[];
  stats: FlatStats | null;
  rank?: number;
  appearance?: { gender: string; customizations: { option: number; choice: number; order: number }[] } | null;
  equipment: EquipItem[];
  /** 전문 기술 (수집 전 데이터면 undefined, 조회 실패면 null) */
  professions?: Profession[] | null;
  /** 완료한 퀘스트 수 */
  questsCompleted?: number | null;
}

export interface Profession {
  id: number;
  name: string;
  icon: string | null;
  skill: number;
  max: number;
  secondary: boolean;
}

/** 클래식 숙련 단계 (최대 숙련도 기준) */
export function professionTier(max: number) {
  return max >= 300 ? "대가" : max >= 225 ? "전문가" : max >= 150 ? "숙련자" : max > 0 ? "수습생" : "";
}

export function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${Math.max(m, 1)}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return `${Math.floor(d / 30)}개월 전`;
}

// ── 특성(가장 많이 투자한 트리) · 특성 배경 (WEB_PROJECT images/talent_background_tbc) ──
/** 대표 특성 = 포인트 최다 트리 (0포인트면 null) */
export function topSpec(c?: { talents?: CharTalentSpec[] } | null): string | null {
  const t = [...(c?.talents ?? [])].sort((a, b) => b.points - a.points)[0];
  return t && t.points > 0 ? t.specName : null;
}

/** 직업별 특성 이름 → 배경 이미지 (WEB_PROJECT tbc_talents.json 트리 ID) */
const SPEC_BG: Record<number, [string, Record<string, number>]> = {
  1: ["warrior", { 무기: 161, 방어: 163, 분노: 164 }],
  2: ["paladin", { 징벌: 381, 신성: 382, 보호: 383 }],
  3: ["hunter", { 야수: 361, 생존: 362, 사격: 363 }],
  4: ["rogue", { 전투: 181, 암살: 182, 잠행: 183 }],
  5: ["priest", { 수양: 201, 신성: 202, 암흑: 203 }],
  7: ["shaman", { 정기: 261, 복원: 262, 고양: 263 }],
  8: ["mage", { 화염: 41, 냉기: 61, 비전: 81 }],
  9: ["warlock", { 파괴: 301, 고통: 302, 악마: 303 }],
  11: ["druid", { 야성: 281, 회복: 282, 조화: 283 }],
};
export function specBg(classId?: number, specName?: string | null): string | null {
  const e = classId != null ? SPEC_BG[classId] : undefined;
  const id = e && specName ? e[1][specName] : undefined;
  return e && id ? `/images/talent_bg/${e[0]}_${id}.jpg` : null;
}
/** 직업의 특성 목록 (사이드바 특성 필터용) */
export const specsOf = (classId: number) => Object.keys(SPEC_BG[classId]?.[1] ?? {});
