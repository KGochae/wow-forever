import THUMBS from "./avatar-thumbs.json";

/**
 * SOOP 프로필 사진 → 사이트에 둔 축소 썸네일 (public/avatars/{soop}.webp, _dev/make-avatars.mjs로 생성)
 * 원본은 움직이는 고해상도 webp(최대 1254px)라 여러 장이 동시에 보이면 스크롤이 끊김 → 움직임은 유지하고 160px로 축소. 썸네일이 없으면 원본 그대로.
 */
const SET = new Set<string>(THUMBS);
const SOOP_RE = /^https:\/\/profile\.img\.sooplive\.co\.kr\/LOGO\/[^/]+\/([^/]+)\//;

export function avatarThumb<T extends string | null | undefined>(url: T): T | string {
  const id = url ? SOOP_RE.exec(url)?.[1] : undefined;
  return id && SET.has(id) ? `/avatars/${id}.webp` : url;
}
