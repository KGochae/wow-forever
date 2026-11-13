"use client";

import { useEffect, useState } from "react";
import { DATA_BASE } from "@/lib/config";

/**
 * 리더보드 데이터 rank.json (매시간 수집기가 생성, 압축 배열 ~9KB gzip)
 *
 * 요청 최소화 — 브라우저 localStorage 시간 캐시
 *  - 저장된 데이터가 "수집시각 + 65분" 전이면 요청 0회 (수집은 매시 58분 + GitHub 지연 5~15분)
 *  - 지났으면 1회 요청 → 수집시각이 같으면(수집 지연) 10분 동안은 다시 묻지 않음
 *  - 저장소를 못 쓰는 환경(시크릿 모드 등)은 메모리 캐시만 → 페이지 이동 간 1회
 *  - 단, index.json 버전(updatedAt ?? collectedAt)이 캐시보다 새로우면(수동 수집·Update 버튼) 시간과 관계없이 즉시 다시 받음
 */
export interface RankFile {
  collectedAt: string;
  /** Update 버튼(Worker)이 행을 고친 시각 — 수집 시각은 그대로라 캐시 무효화용으로 따로 둠 */
  updatedAt?: string;
  keys: string[];
  rows: (number | null)[][]; // [id, ...값(keys 순서)]
}
export type RankStats = Map<number, Record<string, number | null>>;

const LS_KEY = "wf_rank_v1";
const FRESH_MS = 65 * 60e3;
const RETRY_MS = 10 * 60e3;

/** 데이터 버전 = 마지막으로 바뀐 시각 (Update 버튼 > 정기 수집) */
export const dataVer = (f: { collectedAt: string; updatedAt?: string }) =>
  f.updatedAt && Date.parse(f.updatedAt) > Date.parse(f.collectedAt) ? f.updatedAt : f.collectedAt;

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
let memAt = ""; // mem 데이터의 버전(dataVer)

/**
 * minAt: index.json의 버전(dataVer) — 이보다 오래된 캐시는 즉시 버리고 다시 받음
 *  → 수동/예약 수집 직후에도 index만 새로 받으면 리더보드가 바로 따라옴 (추가 확인 요청 없음)
 */
function loadRank(minAt?: string): Promise<RankFile> {
  const stale = (at: string) => !!minAt && Date.parse(at) < Date.parse(minAt);
  if (mem && !(memAt && stale(memAt))) return mem;
  const cached = readCache();
  if (cached && isFresh(cached) && !stale(dataVer(cached.data))) {
    memAt = dataVer(cached.data);
    return (mem = Promise.resolve(cached.data));
  }
  // 받을 때는 브라우저 HTTP 캐시(5분)를 건너뛰고 서버에 재확인 (ETag → 바뀐 게 없으면 304, 본문 전송 없음)
  memAt = "";
  mem = fetch(`${DATA_BASE}/rank.json`, { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`rank.json ${r.status}`);
      return r.json() as Promise<RankFile>;
    })
    .then((d) => { writeCache(d); memAt = dataVer(d); return d; })
    .catch((e) => {
      if (cached) return cached.data; // 네트워크 실패 시 지난 데이터라도 표시
      mem = null;
      throw e;
    });
  return mem;
}

const toMap = (f: RankFile): RankStats =>
  new Map(f.rows.map((r) => [r[0] as number, Object.fromEntries(f.keys.map((k, i) => [k, r[i + 1] ?? null]))]));

export function useRankData(indexVer?: string) {
  const [data, setData] = useState<{ stats: RankStats; collectedAt: string; ver: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!indexVer) return; // index.json 버전을 알고 나서 판단 (index는 어차피 받는 파일)
    let alive = true;
    loadRank(indexVer)
      .then((f) => alive && setData((p) => (p?.ver === dataVer(f) ? p : { stats: toMap(f), collectedAt: f.collectedAt, ver: dataVer(f) })))
      .catch((e) => alive && setError(String(e)));
    return () => { alive = false; };
  }, [indexVer]);
  return { rank: data, error, loading: !data && !error };
}
