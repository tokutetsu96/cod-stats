#!/usr/bin/env node
// PreToolUse hook: Supabaseクエリ変更で team_id フィルタの欠落を警告する。
// マルチテナンシー(team_id)はこのプロジェクトの最重要規約。
// stdin から Claude Code の PreToolUse ペイロード(JSON)を受け取る。
// ブロックはせず警告のみ（誤検知を許容し開発を止めない）。

import { readFileSync } from "node:fs";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function getEditedText(input) {
  const ti = input.tool_input ?? {};
  // Edit: new_string / Write: content / MultiEdit: edits[].new_string
  const parts = [];
  if (typeof ti.new_string === "string") parts.push(ti.new_string);
  if (typeof ti.content === "string") parts.push(ti.content);
  if (Array.isArray(ti.edits)) {
    for (const e of ti.edits) if (typeof e?.new_string === "string") parts.push(e.new_string);
  }
  return { text: parts.join("\n"), filePath: ti.file_path ?? "" };
}

try {
  const raw = readStdin();
  if (!raw.trim()) process.exit(0);
  const input = JSON.parse(raw);
  const { text, filePath } = getEditedText(input);

  // .ts/.tsx のみ対象
  if (!/\.(ts|tsx)$/.test(filePath)) process.exit(0);
  if (!text) process.exit(0);

  // Supabaseのデータ操作を含むか
  const hasQuery = /\.from\(\s*["'`]/.test(text) &&
    /\.(select|update|delete|upsert|insert)\s*\(/.test(text);
  if (!hasQuery) process.exit(0);

  const mentionsTeamId = /team_id/.test(text);
  if (mentionsTeamId) process.exit(0);

  const msg =
    `[team_id ガード] ${filePath} のSupabaseクエリ変更に team_id が見当たりません。\n` +
    `マルチテナンシー規約により、select/update/delete には .eq("team_id", ...) を、` +
    `insert には team_id フィールドを必ず含めてください（CLAUDE.md参照）。`;

  // exit code 2 + stderr で Claude にフィードバック（ブロックはせず注意喚起）
  process.stderr.write(msg + "\n");
  process.exit(0);
} catch {
  // パース失敗等は黙ってスルー（開発を止めない）
  process.exit(0);
}
