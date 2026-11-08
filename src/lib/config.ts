// 배포 환경별 주소 (Vercel 환경변수로 지정, 없으면 로컬 개발 기본값)
//   로컬:  데이터 /data (public/data, npm run collect) · 3D /mv (next.config rewrite) · API 없음(또는 wrangler dev)
//   운영:  NEXT_PUBLIC_API_BASE=https://wow-forever.<계정>.workers.dev
//          NEXT_PUBLIC_DATA_BASE=${API_BASE}/forever/data · NEXT_PUBLIC_MODEL_BASE=${API_BASE}/mv
const trim = (s: string) => s.replace(/\/+$/, "");

export const API_BASE = trim(process.env.NEXT_PUBLIC_API_BASE ?? "");
export const DATA_BASE = trim(process.env.NEXT_PUBLIC_DATA_BASE ?? "/data");
export const MODEL_BASE = trim(process.env.NEXT_PUBLIC_MODEL_BASE ?? "/mv");

/** 운영 사이트 주소 (공유 미리보기 절대경로용) */
export const SITE_URL = "https://wafo-haja.vercel.app";

/** 블리자드 상표·API 이용 고지 (랜딩·뷰어·404 공통) */
export const FAN_NOTICE =
  "World of Warcraft® 및 Blizzard Entertainment®는 Blizzard Entertainment, Inc.의 상표입니다. 이 사이트는 Blizzard와 무관한 비공식 팬사이트이며 Blizzard API 데이터를 사용합니다.";

/** Update 버튼 사용 가능 여부 (Worker 주소가 있을 때만) */
export const CAN_REFRESH = !!API_BASE;
