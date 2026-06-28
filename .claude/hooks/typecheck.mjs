#!/usr/bin/env node
// PostToolUse hook: TS/TSXファイルの編集後に tsc --noEmit で型チェックする。
// テストが無いため型エラー検出が主要な自動安全網。
// stdin から Claude Code の PostToolUse ペイロード(JSON)を受け取る。

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

try {
  const raw = readStdin();
  if (!raw.trim()) process.exit(0);
  const input = JSON.parse(raw);
  const fp = input.tool_input?.file_path ?? "";

  // .ts/.tsx の編集時のみ実行
  if (!/\.(ts|tsx)$/.test(fp)) process.exit(0);

  try {
    execFileSync("npx", ["tsc", "--noEmit"], { stdio: "pipe", cwd: process.env.CLAUDE_PROJECT_DIR });
    process.exit(0);
  } catch (e) {
    const out = `${e.stdout?.toString() ?? ""}${e.stderr?.toString() ?? ""}`.trim();
    // exit 2 + stderr で Claude に型エラーをフィードバック
    process.stderr.write("[typecheck] tsc エラー:\n" + out.split("\n").slice(0, 30).join("\n") + "\n");
    process.exit(2);
  }
} catch {
  process.exit(0);
}
