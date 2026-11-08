import { num, type CharacterDetail } from "@/lib/wow";

/**
 * 길드 비교 기준 (WEB_PROJECT: 바 = 최고치 대비, 흰 마커 = 평균, "상위 N%")
 * 같은 직업끼리 비교 — 직업마다 핵심 스탯 규모가 다르기 때문
 */
export interface StatRef { max: number; avg: number; topPct: (v: number) => number; n: number }

export class GuildStats {
  private cache = new Map<string, StatRef | null>();
  constructor(private chars: CharacterDetail[]) {}

  ref(key: string, classId?: number): StatRef | null {
    const ck = `${classId ?? "all"}:${key}`;
    if (this.cache.has(ck)) return this.cache.get(ck)!;
    const vals = this.chars
      .filter((c) => classId == null || c.classId === classId)
      .map((c) => (key === "ilvl" ? c.ilvl : num(c.stats, key)))
      .filter((v): v is number => v != null)
      .sort((a, b) => b - a);
    let r: StatRef | null = null;
    if (vals.length) {
      const max = vals[0], avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      // 상위 %: 나보다 큰 값의 수 + 1 / 전체
      const topPct = (v: number) => Math.max(1, Math.round(((vals.filter((x) => x > v).length + 1) / vals.length) * 100));
      r = { max, avg, topPct, n: vals.length };
    }
    this.cache.set(ck, r);
    return r;
  }
}
