"use client";

import { useEffect, useState } from "react";
import { DATA_BASE } from "@/lib/config";

/**
 * 리더보드 데이터 rank.json (매시간 수집기가 생성, 압축 배열 ~9KB gzip)
 *
 * 요청 최소화 — 브라우저 localStorage 시간 캐시
 *  - 저장된 데이터가 "수집시각 + 65분" 전이면 요청 0회 (수집은 매시 17분 + GitHub 지연 5~15분)
 *  - 지났으면 1회 요청 → 수집시각이 같으면(수집 지연) 10분 동안은 다시 묻지 않음
 *  - 저장소를 못 쓰는 환경(시크릿 모드 등)은 메모리 캐시만 → 페이지 이동 간 1회
 */
export interface RankFile {
  collectedAt: string;
  keys: string[];
  rows: (number | null)[][]; // [id, ...값(keys 순서)]
}
export type RankStats = Map<number, Record<string, number | null>>;

const LS_KEY = "wf_rank_v1";
const FRESH_MS = 65 * 60e3;
const RETRY_MS = 10 * 60e3;

type Cached = { data: RankFile; checkedAt: number };

function readCache(): Cached | null {
  try {
    const c = JSON.parse(localStorage.getItem(LS_KEY) ?? "null") as Cached | null;
    return c?.data?.rows ? c : null;
  } catch {
    return null;
  }
}
function writeCache(data: RankFile) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ data, checkedAt: Date.now() } satisfies Cached)); } catch {}
}
const isFresh = (c: Cached) => Date.now() < Date.parse(c.data.collectedAt) + FRESH_MS || Date.now() - c.checkedAt < RETRY_MS;

let mem: Promise<RankFile> | null = null;
function loadRank(): Promise<RankFile> {
  if (mem) return mem;
  const cached = readCache();
  if (cached && isFresh(cached)) return (mem = Promise.resolve(cached.data));
  mem = fetch(`${DATA_BASE}/rank.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`rank.json ${r.status}`);
      return r.json() as Promise<RankFile>;
    })
    .then((d) => { writeCache(d); return d; })
    .catch((e) => {
      if (cached) return cached.data; // 네트워크 실패 시 지난 데이터라도 표시
      mem = null;
      throw e;
    });
  return mem;
}

const toMap = (f: RankFile): RankStats =>
  new Map(f.rows.map((r) => [r[0] as number, Object.fromEntries(f.keys.map((k, i) => [k, r[i + 1] ?? null]))]));

export function useRankData() {
  const [data, setData] = useState<{ stats: RankStats; collectedAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadRank()
      .then((f) => alive && setData({ stats: toMap(f), collectedAt: f.collectedAt }))
      .catch((e) => alive && setError(String(e)));
    return () => { alive = false; };
  }, []);
  return { rank: data, error, loading: !data && !error };
}
