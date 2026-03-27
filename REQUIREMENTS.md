# CoD 戦績管理ダッシュボード — 要件定義書

## 概要

Call of Duty のチーム対戦における個人スタッツ・戦績を記録・管理・分析する内製 Web ダッシュボード。
チームメンバー 2〜5 名が使用する認証付きの管理ツール。

---

## 技術スタック

| 項目 | 技術 |
|---|---|
| フレームワーク | Next.js（App Router） |
| スタイリング | Tailwind CSS + shadcn/ui |
| データベース / 認証 | Supabase（PostgreSQL + Supabase Auth） |
| デプロイ | Vercel |

---

## ゲームモードとスタッツ項目

### 共通項目（全モードで記録）

| フィールド名 | 型 | 説明 |
|---|---|---|
| `match_date` | date | 試合日 |
| `mode` | enum | `hardpoint` / `snd` / `overload` |
| `result` | enum | `win` / `lose` |
| `opponent_id` | uuid（FK） | 対戦相手（事前登録済みリストから選択） |
| `player_id` | uuid（FK） | 記録対象のプレイヤー |
| `kills` | integer | キル数 |
| `deaths` | integer | デス数 |
| `damage` | integer | ダメージ量 |
| `memo` | text（nullable） | メモ・コメント |

### Hardpoint 固有項目

| フィールド名 | 型 | 説明 |
|---|---|---|
| `hill_time` | integer | Hill 占拠時間（秒） |

### Search & Destroy（S&D）固有項目

| フィールド名 | 型 | 説明 |
|---|---|---|
| `plants` | integer | 爆弾プラント数 |
| `defuses` | integer | 爆弾ディフューズ数 |
| `first_bloods` | integer | ファーストブラッド数 |
| `first_deaths` | integer | ファーストデッド数 |

### Overload 固有項目

| フィールド名 | 型 | 説明 |
|---|---|---|
| `goals` | integer | ゴール数 |

---

## データモデル（Supabase テーブル設計）

### `players` テーブル

チームメンバーのプロフィール。Supabase Auth の `auth.users` と紐づける。

```sql
create table players (
  id uuid primary key references auth.users(id),
  username text not null,
  created_at timestamptz default now()
);
```

### `opponents` テーブル

対戦相手チームのマスタ。事前登録して試合記録時にリストから選択する。

```sql
create table opponents (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  memo text,
  created_at timestamptz default now()
);
```

### `matches` テーブル

試合単位の記録。1 試合 × 1 プレイヤー = 1 レコード。

```sql
create table matches (
  id uuid primary key default gen_random_uuid(),
  match_date date not null,
  mode text not null check (mode in ('hardpoint', 'snd', 'overload')),
  result text not null check (result in ('win', 'lose')),
  opponent_id uuid not null references opponents(id),
  player_id uuid not null references players(id),

  -- 共通スタッツ
  kills integer not null default 0,
  deaths integer not null default 0,
  damage integer not null default 0,

  -- Hardpoint
  hill_time integer,           -- 秒単位（Hardpoint のみ）

  -- S&D
  plants integer,
  defuses integer,
  first_bloods integer,
  first_deaths integer,

  -- Overload
  goals integer,

  memo text,
  created_at timestamptz default now()
);
```

> モード固有カラムは nullable とし、アプリ側でモードに応じてバリデーションする。

---

## 画面構成

### 1. ログイン画面（`/login`）

- Supabase Auth によるメール＋パスワード認証
- 未ログイン時は全ページからリダイレクト

### 2. ダッシュボード（`/`）

- チーム全体のサマリーを表示
  - 総試合数、勝率（全体 / モード別）
  - メンバー別の KD レシオ一覧
  - 直近の試合結果リスト

### 3. 戦績一覧（`/matches`）

- モード別タブ切り替え（Hardpoint / S&D / Overload）
- テーブル表示（日付、対戦相手、勝敗、個人スタッツ）
- 編集・削除ボタン

### 4. 戦績登録・編集フォーム（`/matches/new`、`/matches/[id]/edit`）

- モードを選択 → 対応するスタッツ入力欄が動的に表示
- 対戦相手はドロップダウンで選択（`opponents` テーブルから取得）
- プレイヤーは自分のアカウントを自動セット（他メンバー分は選択可）

### 5. 対戦相手管理（`/opponents`）

- 対戦相手チームの一覧・登録・編集・削除
- 対戦相手ごとの対戦成績サマリー（勝率・試合数）

### 6. メンバー別スタッツ（`/players/[id]`）

- 選択メンバーのモード別スタッツ集計
- KD レシオ、平均ダメージ、モード固有指標の平均

---

## 算出指標（アプリ側で計算）

| 指標名 | 計算式 |
|---|---|
| KD レシオ | `kills / deaths`（deaths = 0 の場合は kills をそのまま表示） |
| 平均キル | `sum(kills) / count(matches)` |
| 平均ダメージ | `sum(damage) / count(matches)` |
| 勝率 | `count(result = 'win') / count(matches) * 100` |
| 平均 Hill 時間 | `sum(hill_time) / count(matches)` （Hardpoint のみ） |
| 平均プラント | `sum(plants) / count(matches)` （S&D のみ） |
| 平均ディフューズ | `sum(defuses) / count(matches)` （S&D のみ） |

---

## 認証・権限

- 全画面でログイン必須
- 全メンバーが全データの閲覧・登録・編集・削除を実行可能（権限差なし）
- Supabase RLS（Row Level Security）で未認証アクセスをブロック

---

## スコープ外（将来対応）

- グラフ・チャートによる可視化（折れ線、棒グラフ）
- CSV インポート / エクスポート
- 通知機能
- モバイルアプリ
