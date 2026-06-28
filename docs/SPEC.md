# SPEC.md — cod-stats 仕様書

## アプリの目的

Call of Duty チームの戦績を記録・分析するダッシュボード。試合結果と個人スタッツをゲームモード別に管理し、チームのパフォーマンス改善に役立てる。チーム単位のマルチテナンシー構成で、複数チームが独立して利用できる。

---

## 機能要件

### 認証・チーム管理
- email/password によるサインアップ・ログイン（Supabase Auth）
- ロールベースアクセス制御: `admin`（試合登録・削除・設定変更）/ `member`（閲覧・スタッツ確認）
- チーム名変更、メンバー招待・ロール変更

### ダッシュボード
- 全体統計: 勝率・試合数・モード別成績
- プレイヤー別 K/D ランキング（アクティブなメンバーのみ表示）
- 直近5対戦の結果一覧

### 試合（Series）管理
- 試合登録: 対戦相手・日時・種別（scrim/tournament）・YouTube URL
- ゲームモード別スコアと個人スタッツ入力（自チーム・相手チーム）
- 試合編集・削除（admin のみ）
- ドラッグ&ドロップによるプレイヤー並び替え（dnd-kit）

### プレイヤー管理
- プレイヤー登録・編集・削除
- アクティブ/非アクティブ切替（非アクティブは過去メンバーとしてダッシュボードのメンバー別K/Dから除外、admin のみ）
- 個人スタッツページ（モード別・試合別の詳細）

### 対戦相手管理
- 対戦チーム登録・編集
- 対戦履歴・モード別勝率の確認

### 設定
- チーム名変更
- マップ管理（モード別）
- アバター設定

---

## 画面構成

```
/login                         ログイン・サインアップ
/                              ダッシュボード
/matches                       試合一覧
/matches/new                   試合登録
/matches/[id]                  試合詳細
/matches/[id]/edit             試合編集
/players                       プレイヤー一覧
/players/[id]                  プレイヤー詳細・スタッツ
/opponents                     対戦相手一覧
/opponents/[id]                対戦相手詳細・対戦履歴
/settings                      チーム設定
```

---

## データモデル

### テーブル構成

| テーブル | 説明 |
|---------|------|
| `teams` | チーム情報 |
| `profiles` | ユーザープロフィール（role: admin/member） |
| `players` | 自チームプレイヤー（`is_active` でダッシュボード表示制御） |
| `opponents` | 対戦チーム |
| `opponent_players` | 対戦チームのプレイヤー |
| `maps` | マップ（mode 別） |
| `series` | シリーズ（scrim/tournament） |
| `games` | 個別ゲーム（mode, map, score） |
| `game_stats` | 自チームの個人スタッツ |
| `opponent_game_stats` | 相手チームの個人スタッツ |

### 階層構造

```
series
└── games
    ├── game_stats          （自チーム個人スタッツ）
    └── opponent_game_stats （相手チーム個人スタッツ）
```

### ゲームモード別フィールド

| モード | 固有フィールド |
|--------|--------------|
| Hardpoint | `hill_time` |
| S&D | `plants`, `defuses`, `first_bloods`, `first_deaths` |
| Overload | `goals` |

---

## 技術スタック

| 領域 | 採用技術 |
|------|---------|
| フレームワーク | Next.js 16 (App Router) + React 19 + TypeScript 6 |
| データベース | Supabase (PostgreSQL + RLS) |
| 認証 | Supabase Auth (email/password) |
| スタイリング | Tailwind CSS v4 + shadcn/ui（ダークモード固定） |
| フォント | Barlow Condensed / Noto Sans JP |
| ドラッグ&ドロップ | dnd-kit |
| デプロイ | Vercel（関数リージョン: `hnd1` 東京） |

### 非機能要件（パフォーマンス）

- **リージョン整合**: Vercel関数（`vercel.json` で `hnd1` 固定）と Supabase（`ap-northeast-1` 東京）を同一地域に配置する。両者が離れると認証・DBの往復がリクエストごとに越境し、全ページの表示が著しく遅くなる。
- **認証**: セッション検証は `getClaims()`（非対称ES256署名キーによるローカルJWT検証）を用い、Authサーバーへの往復を最小化する。
- **集計**: ダッシュボードのメンバー別K/D・対戦相手別成績はDB側の集計RPC（`get_dashboard_kd_stats` / `get_opponent_match_stats`、いずれも SECURITY INVOKER で RLS により `team_id` 自動スコープ）で算出し、全行転送を行わない。
