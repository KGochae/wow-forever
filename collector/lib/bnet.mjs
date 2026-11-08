// Blizzard Battle.net API 클라이언트 — Node(GitHub Actions)·Cloudflare Worker 공용 (전역 fetch만 사용, fs 없음)
//  - client_credentials 토큰 캐시(만료 60초 전 갱신)
//  - 동시 요청 제한 + 429/5xx 재시도(지수 백오프)
//  - 요청 수 집계(stats) → 수집 로그·한도 확인용
// 한도(커뮤니티 문서 기준): 시간당 36,000 / 초당 100

export const NS = {
  profile: (r) => `profile-forever-${r}`,
  static: (r) => `static-forever-${r}`,
  dynamic: (r) => `dynamic-forever-${r}`,
};

export function createBnet({ clientId, clientSecret, region = "kr", locale = "ko_KR", concurrency = 8 }) {
  if (!clientId || !clientSecret) throw new Error("BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET 환경변수가 필요합니다");
  let token = null, tokenExp = 0;
  const stats = { requests: 0, retries: 0, byStatus: {} };

  async function getToken() {
    if (token && Date.now() < tokenExp) return token;
    const r = await fetch("https://oauth.battle.net/token", {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
      },
    });
    if (!r.ok) throw new Error(`Blizzard 토큰 발급 실패 ${r.status}`);
    const j = await r.json();
    token = j.access_token;
    tokenExp = Date.now() + (j.expires_in - 60) * 1000;
    return token;
  }

  // 간단한 세마포어
  let active = 0; const queue = [];
  const acquire = () => new Promise((res) => (active < concurrency ? (active++, res()) : queue.push(res)));
  const release = () => { const n = queue.shift(); n ? n() : active--; };

  /** @returns {Promise<{status:number, data:any}>} 200이 아니면 data=null */
  async function get(path, ns, { locale: loc = locale, tries = 4 } = {}) {
    const url = `https://${region}.api.blizzard.com${encodeURI(path)}?namespace=${ns}&locale=${loc}`;
    await acquire();
    try {
      for (let t = 0; t < tries; t++) {
        stats.requests++;
        const r = await fetch(url, { headers: { Authorization: `Bearer ${await getToken()}` } });
        stats.byStatus[r.status] = (stats.byStatus[r.status] ?? 0) + 1;
        if (r.status === 429 || r.status >= 500) {
          stats.retries++;
          await new Promise((s) => setTimeout(s, 600 * 2 ** t));
          continue;
        }
        if (r.status === 401 && t === 0) { token = null; continue; }
        return { status: r.status, data: r.ok ? await r.json() : null };
      }
      return { status: 599, data: null };
    } finally {
      release();
    }
  }

  return { get, stats, region };
}
