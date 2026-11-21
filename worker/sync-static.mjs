// public/ 의 정적 파일 → worker/static/s/ 복사 (Worker 정적 자산으로 배포, 사이트는 ${API_BASE}/s/... 로 읽음)
// 원본은 public/ 그대로 둠 (로컬 개발용). public/data 는 운영에서 R2(/forever/data)라 제외
// (fs.cpSync는 OneDrive·한글 경로에서 Node가 비정상 종료돼 직접 복사)
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "public");
const out = join(here, "static", "s");
const DIRS = ["avatars", "images", "background", "lib"];

function copyDir(from, to) {
  mkdirSync(to, { recursive: true });
  let n = 0;
  for (const e of readdirSync(from, { withFileTypes: true })) {
    const a = join(from, e.name), b = join(to, e.name);
    if (e.isDirectory()) n += copyDir(a, b);
    else if (e.isFile()) { copyFileSync(a, b); n++; }
  }
  return n;
}

rmSync(out, { recursive: true, force: true });
for (const d of DIRS) {
  if (!existsSync(join(src, d))) continue;
  console.log(`복사: public/${d} → worker/static/s/${d} (${copyDir(join(src, d), join(out, d))}개)`);
}
