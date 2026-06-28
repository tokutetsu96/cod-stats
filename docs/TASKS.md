# TASKS.md — タスク管理

> 完了したタスクは Done セクションに移動する（削除しない）。新しいタスクは ToDo に追記。

---

## ToDo

### コードレビュー指摘（2026-06-28）

#### Critical: 試合の作成・編集がトランザクション非対応

`series-form.tsx` / `edit-form.tsx` はクライアントから複数の insert/delete を逐次実行しており、途中失敗で中途半端なデータが残る。特に `edit-form.tsx` は全 games を delete した後に再 insert するため、再 insert 失敗時に**試合データが完全消失**する（ロールバック不可）。

- [ ] 作成・編集処理を `"use server"` の Server Action に集約
- [ ] Postgres 関数（RPC）でトランザクション化し原子的に処理
- [ ] 編集は「全削除→再作成」をやめる、または RPC 内で原子化

#### Critical: クライアント直接 insert の team_id 検証は RLS 依存

クライアントは props の `teamId` を信頼して insert しているため、悪意あるクライアントは任意の `team_id` を送れる。マルチテナンシーの安全性が RLS の `WITH CHECK` に完全依存している。

- [x] `games` / `game_stats` / `opponent_game_stats` の INSERT/UPDATE で `WITH CHECK (team_id = ...)` が効いているか検証 → **検証済み（2026-06-28）。全テーブルに `WITH CHECK ((team_id = get_my_team_id()) AND get_my_role()='admin')` が設定済みでクロステナント書き込みは不可。脆弱性なし**
- [ ] サインアップのチーム作成＋プロフィール作成も RPC で原子化（部分失敗で孤立チームが残る）

#### Medium: Supabase security advisor 指摘（DB側ハードニング）

`get_advisors`（security）の結果。

- [x] `function_search_path_mutable`: `get_my_role` / `get_my_team_id` / `auto_confirm_user` を `SET search_path = ''` で固定（権限昇格対策）→ **対応済み（2026-06-28, migration: harden_security_definer_functions）**
- [x] `auto_confirm_user()` の anon/authenticated 直接 RPC 実行を `REVOKE EXECUTE` → **対応済み（同上）**
- [ ] `teams` の INSERT ポリシーが `WITH CHECK (true)`（誰でもチーム作成可）→ サインアップ要件と両立する範囲で制限を検討
- [ ] avatars バケットの SELECT ポリシーが広く一覧可能 → オブジェクトURL閲覧に限定
- [ ] 漏洩パスワード保護（HaveIBeenPwned）が無効 → Supabase ダッシュボードで有効化
- 受容: `get_my_role` / `get_my_team_id` の authenticated EXECUTE は RLS ポリシーで必須のため維持（返すのは呼び出し元自身の role/team_id のみで情報漏洩リスクなし）

#### High: ダッシュボード集計の暗黙 limit で数値が不正確

- `dashboard-stats.tsx` は `games` を `limit(100)` だが「全体勝率」と表示（実態は直近100ゲーム）
- `dashboard-kd-table.tsx` は `game_stats` を `limit(5000)`、母数が食い違い件数超過時に無言で切り捨て

> 既存 ToDo「ダッシュボードの集計クエリを Supabase の集計関数に移行」と関連。

- [ ] Postgres 側集計（ビュー/RPC）に移行し全件取得を廃止
- [ ] 暫定でラベルを実態に合わせる（例: 「直近100試合の勝率」）

#### Medium: hill_times 後方互換の正規化ロジックが3箇所重複

`series-detail-content.tsx` / `edit-form.tsx` / game-card 表示側で旧データ形式変換が個別実装。仕様変更時に乖離リスク。

- [ ] `lib/utils.ts` に `normalizeHillTimes()` として抽出・共通化

#### Medium: 集計ヘルパーの重複

`avg` / `emptyModeAcc` / `toModeStats` / `ModeAcc` 型が `dashboard-kd-table.tsx` と `series-detail-content.tsx` でほぼ同一にコピー。

- [ ] `PlayerKDData` 生成ロジックごと共有モジュールへ切り出し

#### Medium: ProfileProvider / useProfile がデッドコード

`layout.tsx` が全体を `ProfileProvider` でラップしているが `useProfile` の利用箇所ゼロ。

- [ ] 未使用なら `ProfileProvider` / `useProfile` を削除

#### Low: その他

- [ ] Supabase 生成型を導入し `as unknown as` キャストを削減（`supabase gen types`）
- [ ] 脱退・kick でチーム唯一の管理者を消せる → 最低1名の admin を残すガードを追加

---

### 優先度: 高

#### ページネーション / 無限スクロール

対戦一覧・スタッツ取得で `limit(100)` が固定されており、データが増えるとパフォーマンスが低下する。

- 対戦一覧にカーソルベースページネーション（または無限スクロール）を導入
- ダッシュボードの集計クエリを Supabase の集計関数に移行し、全件取得を廃止

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
