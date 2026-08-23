# SPEC.md — cod-stats 仕様書

## アプリの目的

Call of Duty チームの戦績を記録・分析するダッシュボード。試合結果と個人スタッツをゲームモード別に管理し、チームのパフォーマンス改善に役立てる。チーム単位のマルチテナンシー構成で、複数チームが独立して利用できる。CoD は毎年新作が出るため、チーム内で複数の作品（タイトル）を切り替えて記録・閲覧できる。

---

## 機能要件

### 認証・チーム管理
- email/password によるサインアップ・ログイン（Supabase Auth）
- サインアップはRPC（`signup_create_team_with_profile` / `signup_join_team`）で原子的に処理。チーム新規作成時は `admin`、既存チーム参加時は必ず `member` がサーバー側で付与される（クライアントからのrole指定は不可）
- ロールベースアクセス制御: `admin`（試合登録・削除・設定変更）/ `member`（閲覧・スタッツ確認）
- チーム名変更、メンバー招待・ロール変更
- チームに他メンバーが残る場合、最後の `admin` は脱退・除外・降格できない（DBトリガー `prevent_last_admin_removal` で強制。先に別メンバーをadminに昇格させる必要がある）

### ダッシュボード
- 全体統計: 勝率・試合数・モード別成績
- プレイヤー別 K/D ランキング（アクティブなメンバーのみ表示）
- 直近5対戦の結果一覧
- フィルタ: 対戦チーム・期間（直近1週間 / 1ヶ月 / 3ヶ月のプリセット + カスタム日付範囲）・モード（すべて / Hardpoint / S&D / Overload）。全統計カード・K/D・直近対戦に連動

### 試合（Series）管理
- 試合登録: 対戦相手・日時・種別（scrim/tournament）・YouTube URL
- ゲームモード別スコアと個人スタッツ入力（自チーム・相手チーム）
- 試合編集・削除（admin のみ）
- 登録・編集は Server Action 経由で RPC `save_series_with_games` が1トランザクションで原子的に処理（途中失敗時は全ロールバック）。`team_id` / `result` / `game_number` と参照整合性（opponent/player/map の所属チーム）はサーバー側で検証・導出
- ドラッグ&ドロップによるプレイヤー並び替え（dnd-kit）

### プレイヤー管理
- プレイヤー登録・編集・削除
- アクティブ/非アクティブ切替（非アクティブは過去メンバーとしてダッシュボードのメンバー別K/Dから除外、admin のみ）
- 個人スタッツページ（モード別・試合別の詳細）

### 対戦相手管理
- 対戦チーム登録・編集
- 対戦履歴・モード別勝率の確認

### 作品（タイトル）管理
- Navのドロップダウンで作品を切り替え。選択状態はブラウザCookieに保持され、選択中の作品が試合一覧・ダッシュボード・マップ管理などの対象になる
- 設定画面で作品の追加・改名・削除（admin のみ）。チームごとに1つ「既定の作品」を設定でき、Cookie未設定時（初回アクセス等）の初期表示に使われる
- 作品を切り替えても試合登録・編集・マップ管理は通常通り可能（過去作の閲覧専用ロックはしない）
- プレイヤー・対戦チームは作品をまたいで共有（試合記録・マップのみ作品ごとに分離）
- 試合データが1件でも紐づく作品は削除できない（DB制約）。最後の1作品も削除できない

### 設定
- チーム名変更
- 作品（タイトル）管理
- マップ管理（選択中の作品内でモード別）
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
| `titles` | 作品（タイトル）マスタ（`is_default` はチームごとに高々1件） |
| `players` | 自チームプレイヤー（`is_active` でダッシュボード表示制御、作品間で共有） |
| `opponents` | 対戦チーム（作品間で共有） |
| `opponent_players` | 対戦チームのプレイヤー（作品間で共有） |
| `maps` | マップ（mode 別、作品ごとにスコープ） |
| `series` | シリーズ（scrim/tournament、作品ごとにスコープ） |
| `games` | 個別ゲーム（mode, map, score、作品ごとにスコープ） |
| `game_stats` | 自チームの個人スタッツ（作品ごとにスコープ） |
| `opponent_game_stats` | 相手チームの個人スタッツ（作品ごとにスコープ） |

`series` / `games` / `game_stats` / `opponent_game_stats` / `maps` は `team_id` に加えて `title_id` を持つ（`team_id` と同様に非正規化して各テーブルに直接持たせ、JOINなしでフィルタできるようにしている）。`title_id` はセキュリティ境界ではなくアプリ層のフィルタで、RLSは従来通り `team_id` のみで強制する。

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
- **集計**: ダッシュボードの全体/モード別成績・メンバー別K/D・対戦相手別成績はDB側の集計RPC（`get_team_game_stats` / `get_dashboard_kd_stats` / `get_opponent_match_stats`、いずれも SECURITY INVOKER で RLS により `team_id` 自動スコープ）で算出し、全行転送を行わない。「全体勝率」は選択中の作品の全試合を母数に算出する（直近N件への暗黙の制限は持たない）。`get_team_game_stats` / `get_dashboard_kd_stats` は呼び出し側（`title_id` で絞り込んだ `series` id集合）で作品スコープを解決し、`get_opponent_match_stats` は `p_title_id` 引数で絞り込む。

### 非機能要件（データ整合性・セキュリティ）

- **書き込みの原子性**: 複数テーブルにまたがる書き込み（試合の作成・編集、サインアップ）はRPC（Postgres関数）で1トランザクション化する。クライアントからの逐次insertは行わない
- **信頼境界**: `team_id`・`role`・`result` 等の権限・整合性に関わる値はクライアントから受け取らず、サーバー側（RPC内の `get_my_team_id()` / `get_my_role()` 等）で導出する
- **SECURITY DEFINER 関数**: 必ず `SET search_path = ''` を設定し、EXECUTE権限は必要最小限のロールに限定する
- **profiles / teams への直接INSERT**: RLSポリシーを付与しない（サインアップRPC経由のみ）
