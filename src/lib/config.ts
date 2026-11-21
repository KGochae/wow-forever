// 배포 환경별 주소 (Vercel 환경변수로 지정, 없으면 로컬 개발 기본값)
//   로컬:  데이터 /data (public/data, npm run collect) · 3D /mv (next.config rewrite) · API 없음(또는 wrangler dev)
//   운영:  NEXT_PUBLIC_API_BASE=https://wow-forever.<계정>.workers.dev
//          NEXT_PUBLIC_DATA_BASE=${API_BASE}/forever/data · NEXT_PUBLIC_MODEL_BASE=${API_BASE}/mv
const trim = (s: string) => s.replace(/\/+$/, "");

export const API_BASE = trim(process.env.NEXT_PUBLIC_API_BASE ?? "");
export const DATA_BASE = trim(process.env.NEXT_PUBLIC_DATA_BASE ?? "/data");
export const MODEL_BASE = trim(process.env.NEXT_PUBLIC_MODEL_BASE ?? "/mv");
/** 정적 파일(아바타·이미지·배경·모델뷰어 JS) 주소 — Vercel CDN 요청을 줄이려고 운영은 Worker 정적 자산(${API_BASE}/s)에서 받음
 *  로컬 개발은 public/ 그대로 · 원본은 public/, Worker 배포 전 `npm run deploy:worker`가 worker/static/s/로 복사 */
export const STATIC_BASE = trim(
  process.env.NEXT_PUBLIC_STATIC_BASE ?? (process.env.NODE_ENV === "development" || !API_BASE ? "" : `${API_BASE}/s`),
);
/** public/ 기준 경로("/avatars/x.webp") → 실제 주소 */
export const asset = (path: string) => `${STATIC_BASE}${path}`;

/** 운영 사이트 주소 (공유 미리보기 절대경로용) */
export const SITE_URL = "https://wafo-haja.vercel.app";

/** 블리자드 상표·API 이용 고지 (랜딩·뷰어·404 공통) */
export const FAN_NOTICE =
  "WoW® · Blizzard®는 Blizzard Entertainment의 상표이며, 본 사이트는 Blizzard와 무관한 비공식 팬사이트입니다.";

/** Update 버튼 사용 가능 여부 (Worker 주소가 있을 때만) */
export const CAN_REFRESH = !!API_BASE;

/** 레이드 구성 탭 공개 여부 — false면 탭·랜딩 버튼 비활성, /viewer?tab=raid 로 들어와도 캐릭터 뷰어로
 *  운영은 비공개 · 로컬 확인용: .env.local 에 NEXT_PUBLIC_RAID_ENABLED=1 */
export const RAID_ENABLED = process.env.NEXT_PUBLIC_RAID_ENABLED === "1";
