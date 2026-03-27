# cod-stats

Call of Duty のチーム戦績管理ダッシュボード。スクリム・大会の試合結果と個人スタッツを記録・管理する内製 Web ツール。

## 機能

- **戦績管理** — Hardpoint / Search & Destroy / Overload の試合結果を記録
- **個人スタッツ** — キル/デス/ダメージ、モード固有指標（Hill 占拠時間・プラント数・ゴール数など）
- **チームサマリー** — 勝率・KD レシオ・直近の試合結果を一覧表示
- **対戦相手管理** — 対戦相手チームのマスタ管理と対戦成績サマリー
- **認証** — Supabase Auth によるメール/パスワードログイン、チーム単位のデータ分離

## 技術スタック

| 項目 | 技術 |
|---|---|
| フレームワーク | Next.js 16（App Router） |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui |
| データベース / 認証 | Supabase（PostgreSQL + RLS） |
| デプロイ | Vercel |

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` を作成し、Supabase の接続情報を設定する。

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアクセス可能。

## コマンド

```bash
npm run dev    # 開発サーバー起動（Turbopack）
npm run build  # プロダクションビルド
npm run lint   # ESLint 実行
```

## 画面構成

| パス | 画面 |
|---|---|
| `/login` | ログイン |
| `/` | ダッシュボード（チームサマリー） |
| `/matches` | 戦績一覧（モード別タブ） |
| `/matches/new` | 戦績登録 |
| `/matches/[id]/edit` | 戦績編集 |
| `/opponents` | 対戦相手管理 |
| `/players/[id]` | メンバー別スタッツ |
