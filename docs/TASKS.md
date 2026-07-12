# TASKS.md — タスク管理

> 完了したタスクは Done セクションに移動する（削除しない）。新しいタスクは ToDo に追記。

---

## ToDo

### コードレビュー指摘（2026-06-28）の残タスク

- [ ] Supabase 生成型を導入し `as unknown as` キャストを削減（`supabase gen types`）
- 受容: `get_my_role` / `get_my_team_id` の anon/authenticated EXECUTE は RLS ポリシーで必須のため維持（返すのは呼び出し元自身の role/team_id のみで情報漏洩リスクなし）
- 受容: `signup_create_team_with_profile` / `signup_join_team` の authenticated EXECUTE はサインアップに必須（SECURITY DEFINER だが関数内でプロフィール未保有チェック・role強制を実施）
- メモ: avatars バケットは public のため公開URL閲覧自体は RLS を経由しない。本人以外の閲覧も遮断したい場合はバケット非公開化 + signed URL への移行が必要（別タスク）

---

### 優先度: 高

#### ページネーション / 無限スクロール

対戦一覧・スタッツ取得で `limit(100)` が固定されており、データが増えるとパフォーマンスが低下する。

- 対戦一覧にカーソルベースページネーション（または無限スクロール）を導入
- ~~ダッシュボードの集計クエリを Supabase の集計関数に移行し、全件取得を廃止~~ → **完了（2026-06-29, PR #17/#19）**

#### 日付範囲フィルタ

- 「先週」「先月」「直近3ヶ月」などのプリセット期間フィルタ
- カスタム日付範囲ピッカー
- ダッシュボードの統計も期間指定に対応

#### 勝率推移グラフ

- 折れ線グラフで週別・月別の勝率推移を表示
- モード別（Hardpoint / S&D / Overload）に切り替え可能
- ライブラリ候補: Recharts

#### モード別フィルタ（ダッシュボード）

- ダッシュボード上部にモードフィルタタブを追加
- 選択モードで全統計カードを絞り込み

---

### 優先度: 中

#### CSVエクスポート

- 対戦一覧・プレイヤー統計を CSV でダウンロード
- 管理者のみ実行可能（ロール制御）

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
