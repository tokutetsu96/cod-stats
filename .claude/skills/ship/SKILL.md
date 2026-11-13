---
name: ship
description: 作業ツリーの変更をコミットし、ブランチをpush → PR作成 → チェック通過待ち → mainへマージ → ローカルmainを最新化まで一括で行う。「出荷して」「PR出してマージまで」「/ship」で使う。
disable-model-invocation: true
argument-hint: "[コミット/PRの補足説明（任意）]"
---

# ship: コミット → PR → main マージ

変更をコミットしてから main にマージされるまでを一気通貫で行う。途中で失敗したら**その場で停止して原因を報告**し、勝手に回避策（`--force`、`--no-verify`、`--admin` マージ等）を取らない。

引数 `$ARGUMENTS` が与えられた場合は、コミットメッセージ・PR本文の意図として反映する。

## 1. 現状把握

並列で実行する:

```bash
git status --short
git branch --show-current
git diff HEAD --stat
git log --oneline -5
```

- 変更が無く、かつ現在ブランチに未push/未マージのコミットも無い → 「出荷対象なし」と報告して終了
- `.env*`・認証情報・巨大バイナリなど、コミットすべきでないファイルが含まれていたら除外し、報告する

## 2. ブランチ準備

- 現在 `main` の場合は作業ブランチを切る: `git switch -c <prefix>/<kebab-case-summary>`
  - prefix は変更内容で決める: `feature/`（機能追加）、`fix/`（バグ修正）、`chore/`（依存・設定）、`docs/`（ドキュメントのみ）、`refactor/`
  - 例: `feature/team-invite-codes`, `chore/security-updates`, `docs/accept-leaked-password-protection`
- 既に作業ブランチにいる場合はそのまま使う

## 3. 事前チェック

```bash
npm run lint
npm run build
```

- どちらかが失敗したら**コミットせずに停止**し、エラー内容を報告する（修正はユーザー確認後）
- ドキュメントのみの変更（`*.md` だけ）の場合はスキップしてよい

## 4. ドキュメント整合

- 機能追加・修正なら `docs/TASKS.md` の該当タスクを Done セクションへ移動しているか確認（未対応なら更新を同じコミットに含める）
- 仕様変更があれば `docs/SPEC.md` への反映を確認

## 5. コミット

- 変更ファイルを明示的に `git add <path>...` する（`git add -A` は避け、意図しないファイル混入を防ぐ）
- メッセージは **Conventional Commits + 日本語の要約**。既存履歴に合わせる:
  - `feat: チーム参加を招待コード制にし除外ユーザーの再参加を防止`
  - `chore: 依存パッケージの脆弱性対応（next 16.4.6 ほか）`
  - `docs: 脆弱性対応の結果を TASKS.md に記録`
- 論理的に独立した変更が混在していれば複数コミットに分ける
- 末尾にシステムから指示された Co-Authored-By 行を付ける。HEREDOC で渡す:

```bash
git commit -m "$(cat <<'EOF'
feat: 〇〇を追加

Co-Authored-By: ...
EOF
)"
```

- pre-commit hook が失敗したら原因を直して**新しいコミット**を作る（`--amend` / `--no-verify` は使わない）

## 6. push と PR 作成

```bash
git push -u origin HEAD
```

既に同ブランチの PR がある場合（`gh pr view --json number,state` で確認）は新規作成せず、それを使う。

無ければ作成する。タイトルはメインのコミットメッセージ、本文は以下の形式:

```bash
gh pr create --base main --title "feat: 〇〇を追加" --body "$(cat <<'EOF'
## 概要

<何を・なぜ変えたか。1〜3段落>

## 変更点

- <主要な変更を箇条書き>

## 確認事項

- [x] npm run lint
- [x] npm run build

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- 本文に `@` で始まる文字列を書く場合は実在ユーザー宛て以外はバッククォートで囲む

## 7. チェック待ち

```bash
gh pr checks --watch --fail-fast
```

- このリポジトリでは Vercel の Preview デプロイが必須チェックとして走る
- 失敗したらマージせず停止し、失敗したチェック名と URL を報告する（Vercel のビルド失敗ならログ確認を提案）
- チェックが1件も無い場合はそのまま次へ進む

## 8. マージ

リポジトリの慣習（`Merge pull request #N from ...`）に合わせ **merge commit** でマージし、リモートブランチを削除する:

```bash
gh pr merge --merge --delete-branch
```

- コンフリクトや保護ルールでマージできない場合は停止して報告する。`--admin` での強制マージはしない
- main とのコンフリクトがある場合は、ユーザーに確認の上で `git merge origin/main` で解消してから 6 に戻る

## 9. 後処理

```bash
git switch main
git pull --ff-only origin main
git branch -d <作業ブランチ名>   # gh が削除済みなら不要
```

## 10. 報告

結論ファーストで簡潔に:

- マージした PR の番号・タイトル・URL
- 含まれたコミット（`git log --oneline` 相当）
- スキップした手順や、除外したファイルがあればその旨
