import { Suspense } from "react";
import { GuildViewer } from "@/components/guild/guild-viewer";

// /viewer?id={캐릭터id} — 공유 가능한 캐릭터 주소 (이름이 바뀌어도 유지 · 예전 ?c={slug}도 열림)
export default function ViewerPage() {
  return (
    <Suspense>
      <GuildViewer />
    </Suspense>
  );
}
