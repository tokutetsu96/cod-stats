# CLAUDE.md

## Project Overview

Call of Duty チーム戦績管理ダッシュボード（日本語UI）。試合結果と個人スタッツをゲームモード別（Hardpoint, S&D, Overload）に記録・管理する。チーム単位のマルチテナンシー構成。

## Commands

```bash
npm run dev          # 開発サーバー起動（Turbopack）
npm run build        # 本番ビルド
npm run lint         # ESLint
```

## Tech Stack

- **Next.js 16** (App Router, Server Components) + **React 19** + **TypeScript 6**
- **Supabase** — PostgreSQL + RLS + Auth（email/password）
- **Tailwind CSS v4** + **shadcn/ui** — ライト/ダークテーマ対応（`.dark` クラス切替・既定ダーク）、フォント: Barlow Condensed / Noto Sans JP
- **dnd-kit** — ドラッグ&ドロップによるプレイヤー並び替え
- **Vercel** にデプロイ

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── (authenticated)/       # 認証必須ルート（layoutでgetProfile()実行）
│   │   ├── _components/       # ダッシュボード共通コンポーネント
│   │   ├── matches/           # 試合一覧・作成・編集・詳細
│   │   ├── opponents/         # 対戦チーム管理
│   │   ├── players/           # プレイヤー管理
│   │   └── settings/          # チーム設定
│   ├── auth/callback/         # OAuth コールバック
│   └── login/                 # ログイン・サインアップ
├── components/
│   ├── nav.tsx                # ナビゲーションバー（client component）
│   ├── stats-table.tsx        # スタッツテーブル（dnd-kit統合）
│   └── ui/                    # shadcn/ui コンポーネント群
└── lib/
    ├── supabase/
    │   ├── server.ts          # サーバー用Supabaseクライアント
    │   ├── client.ts          # ブラウザ用Supabaseクライアント
    │   ├── middleware.ts      # セッション更新ミドルウェア
    │   └── auth.ts            # getProfile() — React cache()でキャッシュ
    ├── types.ts               # 全TypeScript型定義
    └── utils.ts               # cn(), formatDate()
```

### Data Flow

1. ページ（Server Component）が `getProfile()` で認証・プロフィール取得（`team_id`付き）
2. Supabaseクエリは全て `team_id` でフィルタ（RLSベースのマルチテナンシー）
3. Client Component はprops経由でデータ受取、mutation後は `router.refresh()` で再取得
4. API Routeは使わない — コンポーネントがSupabaseに直接クエリ

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

### Types

`src/lib/types.ts` に全型定義。GameModeは `"hardpoint"` | `"snd"` | `"overload"`。

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
> - `/vercel-plugin:nextjs` — Next.js App Router の実装ガイド
> - `/vercel-plugin:react-best-practices` — TSX ファイルのベストプラクティスレビュー

- UIテキストは全て**日本語**で記述する
- ソースコード修正時は `/vercel-react-best-practices` スキルを参照し、パフォーマンスやベストプラクティスに沿ったコードを書くこと
- Server Component をデフォルトとし、インタラクティブな機能のみ `"use client"` を使う
- Supabaseクエリには必ず `team_id` フィルタを含める（マルチテナンシー）
- shadcn/ui コンポーネント（`src/components/ui/`）は既存のものを再利用する
- パスエイリアス: `@/*` → `./src/*`
- 色は `globals.css` のテーマトークン（`bg-card`, `text-muted-foreground`, `text-win` 等）を使い、`yellow-400` などの固定色を直書きしない（ライト/ダーク両対応のため）
- `cn()` ユーティリティ（clsx + tailwind-merge）でクラス名を結合する
