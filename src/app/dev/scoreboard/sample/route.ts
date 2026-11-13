import { readFile } from "node:fs/promises";
import path from "node:path";

// 開発専用: docs/samples の画像をプレビューページに配信する
const SAMPLES_DIR = path.join(process.cwd(), "docs", "samples");

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not Found", { status: 404 });
  }
  const name = new URL(request.url).searchParams.get("name") ?? "";
  // ディレクトリトラバーサル防止: ファイル名のみ許可
  if (!name || path.basename(name) !== name || !name.endsWith(".png")) {
    return new Response("Bad Request", { status: 400 });
  }
  try {
    const file = await readFile(path.join(SAMPLES_DIR, name));
    return new Response(file, { headers: { "Content-Type": "image/png" } });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
