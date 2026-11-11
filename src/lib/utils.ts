import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * 사용자 정의 글자 크기(text-fl-*, globals.css @theme)를 font-size로 등록
 * — 등록하지 않으면 twMerge가 글자 색으로 오인해 text-tx3 등과 같이 쓸 때 크기 클래스를 지워버림
 */
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["fl-2xs", "fl-xs", "fl-sm", "fl-base", "fl-lg", "fl-xl"] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
