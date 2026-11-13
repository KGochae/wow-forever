// 레이드 구성 저장 · 공유 링크
// - 저장: 브라우저 localStorage (이 기기에서만 보임)
// - 링크: /viewer?tab=raid&comp=… — 파티는 "_", 칸은 ".", 특성은 "-특성키" (예: 123-mm.456..)
import { GROUPS, GROUP_SIZE, SPEC_OPTIONS, defaultSpecKey, type Groups } from "./raid-synergy";
import type { Member } from "./wow";

/** 저장 형식: 칸마다 [캐릭터 id, 특성키] 또는 null */
export type CompSlots = ([number, string | null] | null)[][];
export interface SavedComp { id: string; name: string; slots: CompSlots; updatedAt: number }

const LS_COMPS = "wf_raid_comps_v1";
const LS_DRAFT = "wf_raid_draft_v1";

export const emptyGroups = (): Groups => Array.from({ length: GROUPS }, () => Array(GROUP_SIZE).fill(null));

export const toSlots = (g: Groups): CompSlots => g.map((row) => row.map((s) => (s ? [s.member.id, s.specKey ?? null] : null)));

/** 저장된 칸 → 현재 길드원으로 복원 (길드를 떠난 캐릭터는 빈칸) */
export function fromSlots(slots: CompSlots | null | undefined, byId: Map<number, Member>): Groups {
  const g = emptyGroups();
  const used = new Set<number>();
  slots?.slice(0, GROUPS).forEach((row, gi) =>
    row?.slice(0, GROUP_SIZE).forEach((cell, si) => {
      const m = cell ? byId.get(cell[0]) : undefined;
      if (!m || used.has(m.id)) return;
      used.add(m.id);
      const key = cell?.[1] && SPEC_OPTIONS[m.classId]?.some((o) => o.key === cell[1]) ? cell[1] : defaultSpecKey(m);
      g[gi][si] = { member: m, specKey: key };
    })
  );
  return g;
}

export function encodeComp(g: Groups): string {
  return g.map((row) => row.map((s) => (s ? `${s.member.id}${s.specKey ? `-${s.specKey}` : ""}` : "")).join(".")).join("_");
}
export function decodeComp(str: string): CompSlots {
  return str.split("_").map((row) =>
    row.split(".").map((cell) => {
      const [id, key] = cell.split("-");
      const n = Number(id);
      return cell && Number.isInteger(n) && n > 0 ? [n, key || null] : null;
    })
  );
}

function read<T>(k: string): T | null {
  try { return JSON.parse(localStorage.getItem(k) ?? "null") as T | null; } catch { return null; }
}
function write(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

export const loadComps = (): SavedComp[] => (read<SavedComp[]>(LS_COMPS) ?? []).filter((c) => c?.id && Array.isArray(c.slots));
export const writeComps = (list: SavedComp[]) => write(LS_COMPS, list);
export const loadDraft = () => read<CompSlots>(LS_DRAFT);
export const writeDraft = (slots: CompSlots) => write(LS_DRAFT, slots);
