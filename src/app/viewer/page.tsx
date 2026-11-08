import { Suspense } from "react";
import { GuildViewer } from "@/components/guild/guild-viewer";

// /viewer?c={slug} — 공유 가능한 캐릭터 주소
export default function ViewerPage() {
  return (
    <Suspense>
      <GuildViewer />
    </Suspense>
  );
}
