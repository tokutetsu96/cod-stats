# TASKS.md — タスク管理

> 完了したタスクは Done セクションに移動する（削除しない）。新しいタスクは ToDo に追記。

---

## ToDo

### 受容事項（対応不要と判断済み）

- 受容: `get_my_role` / `get_my_team_id` の anon/authenticated EXECUTE は RLS ポリシーで必須のため維持（返すのは呼び出し元自身の role/team_id のみで情報漏洩リスクなし）
- 受容: `signup_create_team_with_profile` / `signup_join_team` の authenticated EXECUTE はサインアップに必須（SECURITY DEFINER だが関数内でプロフィール未保有チェック・role強制を実施）
- 受容: dnd-kit / Tailwind v4 + shadcn/ui は引き続きデファクトのため現状維持
- メモ: avatars バケットは public のため公開URL閲覧自体は RLS を経由しない。本人以外の閲覧も遮断したい場合はバケット非公開化 + signed URL への移行が必要（別タスク）

---

### 優先度: 中

#### マップ別成績分析

- マップ別勝率テーブル（対戦相手ページ・ダッシュボードに追加）
- 「得意マップ / 苦手マップ」のビジュアル表示

#### 対戦スケジュール管理

- 予定対戦（日時・対戦相手・モード）の登録機能
- カレンダービューで対戦予定を確認
- 試合後にスコア入力して実績に変換

#### YouTube ゲーム別タイムスタンプ

- ゲームごとに YouTube タイムスタンプ（秒数）を登録
- 対戦詳細ページから該当シーンに直接リンク
- `games` テーブルに `youtube_timestamp_sec` カラムを追加

#### 対戦相手の詳細分析

- `opponent_game_stats` を活用した相手プレイヤー別 K/D 表示
- 対戦相手ページに「過去対戦での相手強プレイヤー」リスト

---

### 優先度: 低

#### プレイヤーロール設定

- プレイヤーに役割（スナイパー・サポート・フラッガーなど）を設定
- ロール別の平均スタッツを集計・表示

#### 控え選手管理

- 「スタメン / 控え / 退団」のステータス管理
- 過去の出場記録を保持した退団・アーカイブ機能

#### 通知機能

- 新しい対戦登録時にチームメンバーへ通知
- 実装候補: Web Push 通知 / メール通知

---

## Done

### 作品（タイトル）別のデータ分離（2026-08-23）

CoD は毎年新作が出るため、チーム内で複数の作品（タイトル）を切り替えて扱えるようにした。Navの作品切り替えドロップダウンで行き来でき、チームごとに1つ「既定の作品」を設定して初期表示に使う。

- 作品マスタ `titles`（`team_id`, `name`, `is_default`）を追加。`is_default` はチームごとに高々1件になる部分ユニークインデックスで担保。RLSは `maps` 等と同じ team_id スコープ + admin限定書き込みパターン
- `series` / `games` / `game_stats` / `opponent_game_stats` / `maps` に `title_id`（`on delete restrict`）を追加し、既存データはチームごとに作成した仮作品「作品1」へバックフィル。`maps` の一意制約は `(name, mode, team_id)` → `(name, mode, team_id, title_id)` に変更（作品ごとに同名マップを許容）
- **プレイヤー・対戦チームは全作品で共有する方針に決定**（`players` / `opponents` / `opponent_players` は変更なし）。試合記録とマップのみ作品ごとに分離
- **過去作（非デフォルトの作品）も引き続き編集可能な方針に決定**（読み取り専用ロックは実装しない）
- 「現在の作品」はブラウザCookie（`current_title_id`）で保持し、`getCurrentTitle()`（`getProfile()`と対になるReact `cache()`ヘルパー）がteam_idスコープの `titles` 一覧から解決。Cookieが不正・他チームの値でも自然にフォールバックする（`title_id` はセキュリティ境界にはせず、RLSは従来通り `team_id` のみで強制）
- RPC改修: `signup_create_team_with_profile` はチーム作成と同一トランザクションで既定作品を1件作成。`get_opponent_match_stats()` → `get_opponent_match_stats(p_title_id)`。`save_series_with_games` は新規作成時のみ `p_title_id` を検証採用し、編集時は既存シリーズの `title_id` を維持（選択中の作品を切り替えても既存対戦の所属作品が変わらないようにするため）
- ダッシュボードは「対戦相手・期間フィルタ未指定ならseries解決クエリをスキップ」という早期リターンを廃止し、常に `title_id` で絞り込んだseries id集合をRPCへ渡す方式に変更（既存の集計RPC本体は無改修）
- 設定画面に「作品管理」カード（`title-manager.tsx`、追加・改名・削除・既定設定のadmin限定CRUD）を追加。マップ管理カードは選択中の作品名を見出しに表示し、その作品のマップのみ扱う
- 使い捨てチーム・ユーザーでのPlaywright E2E検証を実施（作品追加→切り替え→マップの作品間分離→復帰後のデータ残存、既定作品の切り替えを実データで確認後、チーム・ユーザーを削除済み）。supabase-rls-reviewerエージェントによるRLS・マルチテナンシーレビューを実施し、指摘（既定設定の2ステップ更新が非原子的だった点）を受けて `set_default_title` RPC（admin+team所有チェック込みで1トランザクション化）に置き換え。DROP FUNCTION→再作成後の`authenticated`ロールへのEXECUTE権限引き継ぎも実DBで確認済み

### 勝率推移グラフを削除（2026-07-16）

- 画面確認の結果、勝率推移グラフは不要と判断し削除。`dashboard-winrate-chart.tsx` / `winrate-chart.tsx` を削除し `dashboard-content.tsx` から除去
- 集計RPC `get_team_winrate_trend` をマイグレーション `drop_get_team_winrate_trend` で削除し、`database.types.ts` の型定義も除去
- 唯一の利用箇所だった `recharts` をアンインストール。`SPEC.md` を更新

### 技術スタック調査の残タスク消化（2026-07-16）

- **Supabase 生成型を導入し `as unknown as` を全廃（5→0）**: `src/lib/database.types.ts`（`supabase gen types` 相当）を追加。クライアントの全体型付けは、ドメイン型（`GameMode`/`SeriesType` 等のユニオン・非null `created_at`）とDBのtext/nullableカラムの差により RSC→フォーム境界で逆に `as unknown as` が増える構造のため見送り。代わりに読み取り箇所で `.returns<T>()` を用いて型を付与し、`as unknown as` を除去（`auth.ts` ×2 / `series-detail-content.tsx` / `opponent-detail-content.tsx` / `dashboard-recent-matches.tsx`）。`.single()` では `.returns<T[]>().single()` の順が必要。`dashboard-recent-matches` の読み取りモデルは生成 `Tables<>` から導出しスキーマ追従。
- **`@supabase/ssr` を `^0.9.0` → `0.12.3` へ更新**: Cookie 処理（`getAll` / `setAll`）は 0.5 系以降安定で破壊的変更なし。typecheck / build パス、`npm audit` 0 件を確認
- **`tsconfig.json` の `target` を `ES2017` → `ES2022`**: `noEmit` 環境のため target は型チェックの lib 前提に作用（ブラウザ出力は SWC/browserslist が制御）。ES2025 は最新API前提を含むため、広くサポートされ安全な ES2022 を採用
- **Next.js 16 Cache Components 導入を評価 → 見送り**: 全ページが認証必須・チーム別（RLSベース）・mutation駆動（`router.refresh()`）。`"use cache"` は認証スコープの動的データにはキャッシュ無効化配線とクロステナント漏洩リスクを伴い、集計RPCは既にDB側・東京同居で高速なため便益が薄い。共有静的データ（マップマスタ等）が生じた場合に再検討
- **React Compiler 有効化を評価 → 見送り**: クライアントコンポーネントが少なく手動メモ化も最小限で自動メモ化の便益が小さい。Babelプラグイン追加・Turbopack併用の複雑化に見合わない。クライアント対話性が増えた場合に低コストで再検討可能

### 優先度高: ダッシュボードのフィルタ強化と勝率推移グラフ（2026-07-12）

- **日付範囲フィルタ**: プリセット（直近1週間 / 1ヶ月 / 3ヶ月）+ カスタム日付範囲ピッカーを追加。対戦相手・期間フィルタは対象 series の id 集合に解決し、既存の集計RPC群（`p_series_ids`）へそのまま渡す方式（RPC変更不要）
- **モード別フィルタ**: ダッシュボード上部にモードタブ（すべて / Hardpoint / S&D / Overload）を追加。統計カード・K/D・直近対戦・グラフ全てが絞り込まれる（直近対戦は `games!inner` + `games.mode` でモード内のW/Lを表示）
- **勝率推移グラフ**: 集計RPC `get_team_winrate_trend`（週別/月別、SECURITY INVOKER + RLS）を追加し、Recharts の折れ線で表示。週別/月別トグルは両データ先読みでクライアント切替、50%基準線・ホバーツールチップ付き。フィルタ（期間・対戦相手・モード）に連動
- Playwright によるE2E検証実施（使い捨てユーザーでダッシュボード描画・モードタブ・期間プリセット・カスタム範囲・月別トグルを実データで確認後、ユーザー削除済み）

### 優先度高: ページネーション（確認: 実装済み）（2026-07-12）

- 対戦一覧は `page` + `opponent` searchParams によるページネーション（PAGE_SIZE=20、ページ番号UI・省略記号つき）が既に実装済みであることを確認。`limit(100)` 固定は現存しない

### Critical: 試合の作成・編集をServer Action + RPCで原子化（2026-07-11, PR #20）

- `save_series_with_games` RPC（SECURITY INVOKER, `set search_path=''`）を追加し、シリーズ+ゲーム+スタッツの作成・編集を1トランザクション化。編集の「全削除→再insert」はRPC内で原子化され、途中失敗時は全てロールバック（試合データ完全消失バグの根治）
- 作成・編集処理を `"use server"` の Server Action（`matches/actions.ts` の `saveSeries`）に集約。Server Action内で認証+adminロールを検証
- `team_id` / `result` / `game_number` はDB側で導出し、クライアントの `teamId` propを信頼しない。opponent / player / opponent_player / map のチーム所属もRPC内で明示検証
- supabase-rls-reviewer エージェントによるレビュー実施。指摘事項（`p_series_id` の所有チーム検証・search_path固定・EXECUTE最小化）は全て実装済みであることを実DBで確認
- 実DBでトランザクションシミュレーション検証（作成/編集/途中失敗ロールバック/非admin拒否/クロステナント拒否）

### Critical: サインアップのチーム+プロフィール作成をRPCで原子化（2026-07-11, PR #20）

- `signup_create_team_with_profile` / `signup_join_team` RPC（SECURITY DEFINER, `set search_path=''`, authenticated のみ EXECUTE 可）で原子化。部分失敗による孤立チームが残らない
- **権限昇格経路の遮断**: 旧実装はクライアントが `role` を直接insertしており、任意の team_id へ `role='admin'` で自己登録可能だった。RPC移行で既存チーム参加は必ず `member` になる
- 新コードのデプロイ確認後、`teams` の `WITH CHECK (true)` INSERT ポリシーと `profiles` の直接 INSERT ポリシーを削除（migration: tighten_signup_insert_policies）。直接INSERT拒否とRPC経由サインアップ成功を実DBで検証

### Medium: DB側ハードニング（2026-07-11）

- `teams` INSERT ポリシー（`WITH CHECK (true)`）削除 → サインアップはRPC経由に一本化（上記）
- avatars バケットの SELECT ポリシーを本人フォルダ（`auth.uid() = foldername[1]`）に限定。バケットは public のため公開URLでの画像表示は影響なし、API経由の全オブジェクト一覧を防止
- 漏洩パスワード保護（HaveIBeenPwned）をSupabaseダッシュボードで有効化（2026-07-11、手動対応）

### Medium: hill_times 正規化ロジックの共通化（2026-07-11, PR #21）

- `lib/utils.ts` に `normalizeHillTimes()` を追加し、`edit-form.tsx` / `series-detail-content.tsx` の旧データ形式変換（フラット配列・1次元オブジェクト→2次元）を一本化

### Medium: 集計ヘルパーの共通化（2026-07-11, PR #21）

- `lib/kd-stats.ts` を新設。`ModeAcc` / `avg` / `toModeStats` / `PlayerKDData` 生成を `addStat` / `toPlayerKDData` として共通化し、`dashboard-kd-table.tsx`（RPC集計行）と `series-detail-content.tsx`（生スタッツ行）の重複を解消

### Low: チーム最後の管理者を消せないガードを追加（2026-07-11, PR #20）

- `profiles` への BEFORE DELETE/UPDATE トリガー `prevent_last_admin_removal`（SECURITY DEFINER, `set search_path=''`, 直接EXECUTE不可）を追加。他メンバーが残るチームで最後のadminの脱退・kick・降格をDBレベルで拒否
- 設定画面（脱退・kick・ロール変更）でガード理由がそのまま表示されるようエラーハンドリングを改善

### High: ダッシュボード集計の暗黙 limit で数値が不正確（2026-06-29 完了）

- `dashboard-stats.tsx` の `games` limit(100)（「全体勝率」が実態は直近100ゲーム）→ RPC `get_team_game_stats` で全件集計に移行（PR #19）
- `dashboard-kd-table.tsx` の `game_stats` limit(5000) 無言切り捨て → RPC `get_dashboard_kd_stats` に移行（PR #17）
- `opponents/page.tsx` も RPC `get_opponent_match_stats` に移行（PR #17）。Postgres 側集計への移行・全件取得の廃止が完了

### Medium: ProfileProvider / useProfile がデッドコード（2026-06-29 完了）

- `useProfile` の利用箇所ゼロを確認し、`ProfileProvider` / `profile-context.tsx` を削除（commit 6042f1d）

### ページ表示パフォーマンス改善（リージョン整合・認証往復削減・集計RPC化）（2026-06-29, PR #17）

本番（Vercel）で全ページが遅い主因を特定し対応。主因は **Vercel関数がデフォルトの iad1（米国東部）実行で、Supabase DB（東京/ap-northeast-1）への認証往復・DBクエリが毎リクエスト太平洋を横断**していたこと。

- `vercel.json` 新規追加: 関数リージョンを `hnd1`（東京）に固定しDBと同一地域化（最大効果）。`.gitignore` の `*.json` 包括除外に `!vercel.json` 例外を追加
- 認証往復削減: `middleware.ts` / `auth.ts` の `getUser()` を `getClaims()` に変更（非対称ES256署名キー有効を確認済み、ローカルJWT検証でAuthサーバー往復を削減）
- ダッシュボード集計をDB側へ: 集計RPC `get_dashboard_kd_stats` / `get_opponent_match_stats` を追加（SECURITY INVOKER、RLSで team_id 自動スコープ）。`dashboard-kd-table.tsx`（旧 `limit(5000)`）と `opponents/page.tsx`（旧 `limit(200)`）の全行転送を廃止
- セキュリティアドバイザーで新規警告ゼロ、lint/build/typecheck パス、本番デプロイ READY（hnd1）を確認

### 依存パッケージの脆弱性対応（2026-06-28）

- `npm audit fix` を実行し **0 vulnerabilities** に解消
- Next.js を 16.2.5 → **16.2.9** に更新。HIGH 深刻度の **Middleware/Proxy bypass（認証バイパス）**、Cache poisoning、XSS、SSRF、DoS 等を解消
- `ws`（メモリ開示/DoS）、`brace-expansion`（ReDoS）、`postcss` も併せて解消
- 旧記載「PostCSS は `--force` 不可で修正できない」は誤り（プレーンな `npm audit fix` で解消）として削除
- typecheck / lint / build 全てパスを確認
- RLS の `WITH CHECK` を実DBで検証し、クロステナント書き込み脆弱性がないことを確認（DB側の追加ハードニングは ToDo に記載）

### モバイルUI対応（全件完了）

- ナビゲーションバーのオーバーフロー修正
- 対戦一覧テーブルのモバイルカードレイアウト化
- 試合詳細ページのゲームヘッダーオーバーフロー修正
- 対戦チームリストの行内情報過多を2行に分離
- 対戦登録/編集フォームのレスポンシブグリッド化
- NumericInput のモバイル向けサイズ拡大
- ダッシュボード KD / 直近対戦テーブルのカードレイアウト化
- フィルタードロップダウンの固定幅解除
- 入力フィールドの高さ・テキストサイズのレスポンシブ化
- スタッツテーブルのドラッグハンドルタッチ領域拡大
- 設定ページのチーム名編集フォームのモバイル対応
- ダッシュボード概要カード・ページタイトルのレスポンシブ化
- 選手リスト・対戦チームリストの列幅レスポンシブ化
- 設定ページのモード切替ボタン均等幅対応
- チームメンバー管理の操作ボタン間隔調整

### パフォーマンス改善（Tier1）

- クエリ絞り込み・O(n²) 解消・コード整理（PR #3）

### ダッシュボード パフォーマンスレビュー対応

- メンバー別 K/D: `game_stats` に `games(mode)` を埋め込み、各 stat が自身の mode を保持する形に変更。別途の `games` クエリと `gameIdToMode` Map を削除（往復1回削減）
- games(limit 100) と game_stats(limit 5000) の不整合による集計欠落バグを解消
- `dashboard-stats.tsx`: 勝率集計の `limit(100)` に `order("created_at", desc)` を追加し直近100ゲームで決定的に
- 未使用の `game_id` を K/D クエリの select から削除
- デッドコード `dashboard-mode-stats.tsx` を削除

### ダッシュボード表示メンバー選択

- `players.is_active` カラムを追加（boolean, default true）
- プレイヤー管理画面に表示トグル（Eye/EyeOff）を追加（admin のみ操作可）
- ダッシュボードのメンバー別 K/D をアクティブメンバーのみ表示に変更
