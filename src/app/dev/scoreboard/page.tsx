import { readdir } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { ScoreboardPreview } from "./_components/scoreboard-preview";

// 開発専用: Supabase・ログインなしでスコアボード画像取り込みを確認するプレビュー
export default async function ScoreboardPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const samples = (await readdir(path.join(process.cwd(), "docs", "samples")).catch(() => []))
    .filter((f) => f.endsWith(".png"));

  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold">スコアボード取り込みプレビュー（開発専用）</h1>
        <p className="text-sm text-muted-foreground">
          モックのプレイヤー・対戦相手で動作確認します。データは保存されません。
        </p>
      </div>
      {samples.length > 0 ? (
        <ul className="text-sm space-y-1">
          {samples.map((name) => (
            <li key={name}>
              サンプル:{" "}
              <a
                href={`/dev/scoreboard/sample?name=${encodeURIComponent(name)}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                {name}
              </a>
              （開いた画像をコピーまたはドラッグして取り込み欄へ）
            </li>
          ))}
        </ul>
      ) : null}
      <ScoreboardPreview />
    </main>
  );
}
