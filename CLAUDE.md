# CLAUDE.md

## Project Overview

Call of Duty チーム戦績管理ダッシュボード（日本語UI）。試合結果と個人スタッツをゲームモード別（Hardpoint, S&D, Overload）に記録・管理する。チーム単位のマルチテナンシー構成。

## Architecture

### Data Flow

1. ページ（Server Component）が `getProfile()` で認証・プロフィール取得（`team_id`付き）
2. Supabaseクエリは全て `team_id` でフィルタ（RLSベースのマルチテナンシー）
3. Client Component はprops経由でデータ受取。データ更新は Server Action（各ルートの `actions.ts`）経由で行い、`ActionResult`（`{ ok, error }`）を返す。Action 内で権限チェック・`team_id` スコープ・`revalidatePath` を行う（共通ヘルパー: `src/lib/supabase/admin.ts`、クライアント側: `src/lib/use-action.ts`）
4. API Routeは使わない。ブラウザ用Supabaseクライアントを使うのは認証（ログイン・ログアウト）とアバター画像のStorageアップロードのみ

### Data Model

`series` → `games` → `game_stats` / `opponent_game_stats` の階層構造。

| テーブル | 説明 |
|---------|------|
| `teams` | チーム情報 |
| `profiles` | ユーザープロフィール（`team_id` = 選択中チーム） |
| `team_members` | ユーザーとチームの所属（多対多、role: admin/member をチームごとに保持） |
| `team_invites` | チーム招待コード（管理者が発行、有効期限・使用回数上限つき） |
| `team_bans` | 除外したユーザー（招待コードでの再参加を拒否） |
| `players` | 自チームプレイヤー |
| `opponents` | 対戦チーム |
| `opponent_players` | 対戦チームのプレイヤー |
| `maps` | マップ（mode別） |
| `series` | シリーズ（scrim/tournament） |
| `games` | 個別ゲーム（mode, map, score） |
| `game_stats` | 自チームの個人スタッツ |
| `opponent_game_stats` | 相手チームの個人スタッツ |

モード別固有フィールド:
- **Hardpoint**: `hill_time`
- **S&D**: `plants`, `defuses`, `first_bloods`, `first_deaths`
- **Overload**: `goals`

### Auth & Middleware

- `src/proxy.ts` がミドルウェアとして全リクエストで `updateSession()` を実行
- 未認証ユーザーは `/login` にリダイレクト（`/login`, `/auth` を除く）
- ロールベースアクセス制御: `role === "admin"` でUI表示を切替（試合作成・削除等）
- 複数チーム所属: `getProfile()` は選択中チームの `team_id` / `role` を `profile` に解決して返し、所属一覧を `teams` で返す。選択中チームが無効なら `/join-team` へリダイレクト

## タスク管理ルール

- タスクは `docs/TASKS.md` に記載する
- 完了したタスクは **Done セクションに移動**する（削除しない）
- 新しいタスクは `docs/TASKS.md` の ToDo セクションに追記する
- 仕様・機能要件の変更は `docs/SPEC.md` に反映する

## Coding Guidelines

> **[MANDATORY]** ソースコード修正・実装を行う前に、必ず以下のスキルを参照すること。スキルの参照を省略してはならない。
> - `/vercel-react-best-practices` — React/Next.js パフォーマンスとベストプラクティス
> - `/vercel:nextjs` — Next.js App Router の実装ガイド

- UIテキストは全て**日本語**で記述する
- Server Component をデフォルトとし、インタラクティブな機能のみ `"use client"` を使う
- Supabaseクエリには必ず `team_id` フィルタを含める（マルチテナンシー）
- shadcn/ui コンポーネント（`src/components/ui/`）は既存のものを再利用する
- 色は `globals.css` のテーマトークン（`bg-card`, `text-muted-foreground`, `text-win` 等）を使い、`yellow-400` などの固定色を直書きしない（ライト/ダーク両対応のため）
- `cn()` ユーティリティ（clsx + tailwind-merge）でクラス名を結合する
