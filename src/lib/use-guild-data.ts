"use client";

import { useEffect, useState } from "react";
import type { CharacterDetail, ClassTalents, Member } from "@/lib/wow";
import { API_BASE, DATA_BASE } from "@/lib/config";

/**
 * 데이터 로딩 전략 (경량화)
 *  - index.json        : 사이드바·검색용 길드원 목록 (~10KB gzip) — 앱 전체에서 1회만 요청
 *  - chars/{id}.json   : 캐릭터 상세 (~6KB) — 사이드바 클릭·검색 시 해당 1명만 요청, 메모리 캐시
 *  - talents/{cls}.json: 직업 특성 트리 — 해당 직업을 볼 때만
 */
export interface GuildIndex {
  guild: { name: string; id: number; faction?: string };
  collectedAt: string;
  members: Member[];
}

let indexPromise: Promise<GuildIndex> | null = null;
function loadIndex() {
  // no-cache: 브라우저 HTTP 캐시(5분) 대신 매 진입 시 서버 재확인 (ETag → 변화 없으면 304) → 수집 직후 바로 반영
  indexPromise ??= fetch(`${DATA_BASE}/index.json`, { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw new Error(`index.json ${r.status}`);
    return r.json() as Promise<GuildIndex>;
  });
  indexPromise.catch(() => { indexPromise = null; });
  return indexPromise;
}

export function useGuildIndex() {
  const [data, setData] = useState<GuildIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadIndex().then((d) => alive && setData(d)).catch((e) => alive && setError(String(e)));
    return () => { alive = false; };
  }, []);
  return { index: data, error, loading: !data && !error };
}

const charCache = new Map<number, Promise<CharacterDetail | null>>();
export function loadCharacter(id: number) {
  if (!charCache.has(id)) {
    const p = fetch(`${DATA_BASE}/chars/${id}.json`).then((r) => (r.ok ? (r.json() as Promise<CharacterDetail>) : null));
    p.catch(() => charCache.delete(id));
    charCache.set(id, p);
  }
  return charCache.get(id)!;
}

// Update 버튼으로 갱신된 캐릭터를 화면에 즉시 반영하기 위한 구독
const charListeners = new Set<(id: number, c: CharacterDetail) => void>();

export type RefreshResult =
  | { ok: true; character: CharacterDetail }
  | { ok: false; reason: "cooldown"; retryAfter: number }
  | { ok: false; reason: "error"; message: string };

/** Update 버튼: Worker가 Blizzard 실시간 조회 → R2 갱신 → 새 데이터 반환 */
export async function refreshCharacter(id: number, slug: string): Promise<RefreshResult> {
  try {
    // id 기준 (c=slug는 예전 Worker 호환용)
    const r = await fetch(`${API_BASE}/forever/refresh?id=${id}&c=${encodeURIComponent(slug)}`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (r.status === 429 && j.error === "cooldown") return { ok: false, reason: "cooldown", retryAfter: j.retryAfter ?? 600 };
    if (r.status === 429) return { ok: false, reason: "error", message: "요청이 너무 많습니다. 잠시 후 다시 시도하세요" };
    if (r.status === 409) return { ok: false, reason: "error", message: "이름이 바뀐 캐릭터입니다 (다음 정기 수집 후 반영)" };
    if (!r.ok || !j.ok) return { ok: false, reason: "error", message: j.status === 404 || r.status === 404 ? "블리자드에서 조회되지 않습니다 (로그아웃 후 반영)" : "갱신 실패" };
    const c = j.character as CharacterDetail;
    charCache.set(c.id, Promise.resolve(c));
    charListeners.forEach((f) => f(c.id, c));
    return { ok: true, character: c };
  } catch {
    return { ok: false, reason: "error", message: "서버에 연결할 수 없습니다" };
  }
}

/** 선택된 1명의 상세 데이터 */
export function useCharacter(id: number | null | undefined, has = true) {
  const [state, setState] = useState<{ id: number | null; data: CharacterDetail | null; loading: boolean }>({ id: null, data: null, loading: false });
  useEffect(() => {
    if (id == null || !has) { setState({ id: id ?? null, data: null, loading: false }); return; }
    let alive = true;
    setState((s) => ({ id, data: s.id === id ? s.data : null, loading: true }));
    loadCharacter(id).then((d) => alive && setState({ id, data: d, loading: false })).catch(() => alive && setState({ id, data: null, loading: false }));
    const onUpdate = (uid: number, c: CharacterDetail) => { if (alive && uid === id) setState({ id, data: c, loading: false }); };
    charListeners.add(onUpdate);
    return () => { alive = false; charListeners.delete(onUpdate); };
  }, [id, has]);
  return state.id === id ? state : { id: id ?? null, data: null, loading: id != null && has };
}

/** 검색어 → 길드원 (정확히 "이름 성" / slug / 이름만 / 부분 일치 후보) */
export function searchMembers(members: Member[], q: string): { exact: Member | null; candidates: Member[] } {
  const t = q.trim().replace(/s+/g, " ");
  if (!t) return { exact: null, candidates: [] };
  const slug = t.replace(/ /g, "-");
  const full = members.find((m) => `${m.name} ${m.surname}` === t || m.slug === slug) ?? null;
  const byName = members.filter((m) => m.name === t || m.surname === t);
  const partial = members.filter((m) => `${m.name} ${m.surname}`.includes(t));
  // 정확히 일치(이름 성) → 이름/성 일치 → 부분 일치 순, 중복 제거 — 일치해도 목록은 계속 보여줌
  const seen = new Set<number>();
  const candidates = [full, ...byName, ...partial].filter((m): m is Member => !!m && !seen.has(m.id) && !!seen.add(m.id)).slice(0, 8);
  const exact = full ?? (byName.length === 1 ? byName[0] : null);
  return { exact, candidates };
}

/** 직업별 특성 트리 (public/data/talents/{classId}.json) — 필요할 때만 로드 */
const talentCache = new Map<number, Promise<ClassTalents | null>>();
export function useClassTalents(classId?: number) {
  const [data, setData] = useState<ClassTalents | null>(null);
  useEffect(() => {
    if (classId == null) return;
    let alive = true;
    if (!talentCache.has(classId)) {
      talentCache.set(classId, fetch(`${DATA_BASE}/talents/${classId}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
    }
    talentCache.get(classId)!.then((d) => alive && setData(d));
    return () => { alive = false; };
  }, [classId]);
  return data?.classId === classId ? data : null;
}
