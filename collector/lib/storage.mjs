// 저장소 추상화: local(개발: public/data) | worker(운영: wow-forever Worker 경유 R2) | r2(S3 API 직접, 예비)
//   STORAGE=local   → LOCAL_DIR (기본 public/data)
//   STORAGE=worker  → WORKER_URL, INGEST_TOKEN  (R2 API 키 불필요 — 운영 기본)
//   STORAGE=r2      → R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
import fs from "node:fs";
import path from "node:path";

export const CACHE = {
  data: "public, max-age=300, s-maxage=3600, stale-while-revalidate=600", // index / chars
  static: "public, max-age=86400, s-maxage=604800",                          // talents
  state: "no-store",                                                        // 수집기 내부
};

export async function createStorage(env = process.env) {
  const kind = env.STORAGE ?? "local";
  if (kind === "local") {
    const root = path.resolve(env.LOCAL_DIR ?? "public/data");
    return {
      kind, root,
      async getJSON(key) {
        try { return JSON.parse(fs.readFileSync(path.join(root, key), "utf8")); } catch { return null; }
      },
      async putJSON(key, obj) {
        const f = path.join(root, key);
        fs.mkdirSync(path.dirname(f), { recursive: true });
        fs.writeFileSync(f, JSON.stringify(obj));
      },
    };
  }
  if (kind === "worker") {
    for (const k of ["WORKER_URL", "INGEST_TOKEN"]) if (!env[k]) throw new Error(`${k} 환경변수가 필요합니다`);
    const base = `${env.WORKER_URL.replace(/\/+$/, "")}/forever/ingest`;
    const auth = { Authorization: `Bearer ${env.INGEST_TOKEN}` };
    const call = async (method, key, init = {}) => {
      for (let t = 0; t < 4; t++) {
        const r = await fetch(`${base}/${key}`, { method, ...init, headers: { ...auth, ...(init.headers ?? {}) } });
        if (r.status < 500 && r.status !== 429) return r;
        await new Promise((s) => setTimeout(s, 500 * 2 ** t));
      }
      throw new Error(`Worker ${method} ${key} 재시도 실패`);
    };
    return {
      kind, root: `worker:${env.WORKER_URL}`,
      async getJSON(key) {
        const r = await call("GET", key);
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`Worker GET ${key} ${r.status}`);
        return r.json();
      },
      async putJSON(key, obj, { cacheControl } = {}) {
        const r = await call("PUT", key, { body: JSON.stringify(obj), headers: { "Content-Type": "application/json", ...(cacheControl ? { "X-Cache-Control": cacheControl } : {}) } });
        if (!r.ok) throw new Error(`Worker PUT ${key} ${r.status} ${await r.text()}`);
      },
    };
  }
  if (kind === "r2") {
    const { AwsClient } = await import("aws4fetch");
    for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"]) {
      if (!env[k]) throw new Error(`${k} 환경변수가 필요합니다`);
    }
    const aws = new AwsClient({ accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });
    const base = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}`;
    const url = (key) => `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
    return {
      kind, root: `r2://${env.R2_BUCKET}`,
      async getJSON(key) {
        const r = await aws.fetch(url(key));
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`R2 GET ${key} ${r.status}`);
        return r.json();
      },
      async putJSON(key, obj, { cacheControl } = {}) {
        const r = await aws.fetch(url(key), {
          method: "PUT",
          body: JSON.stringify(obj),
          headers: { "Content-Type": "application/json; charset=utf-8", ...(cacheControl ? { "Cache-Control": cacheControl } : {}) },
        });
        if (!r.ok) throw new Error(`R2 PUT ${key} ${r.status}`);
      },
    };
  }
  throw new Error(`알 수 없는 STORAGE=${kind}`);
}
