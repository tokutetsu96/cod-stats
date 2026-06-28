---
name: new-game-mode-field
description: ゲームモード別(Hardpoint/S&D/Overload)のスタッツ項目を追加・変更するときの定型手順。types.ts → クエリ → テーブル表示 → 入力フォームまで漏れなく対応する。
disable-model-invocation: true
---

# ゲームモード別フィールドの追加・変更

cod-stats のモード別固有フィールド（Hardpoint: `hill_time` / S&D: `plants`・`defuses`・`first_bloods`・`first_deaths` / Overload: `goals`）を追加・変更する際の手順。1箇所でも漏れると保存・表示が壊れるため、以下を必ず順に確認する。

## 前提

- 型は `src/lib/types.ts` に集約（`GameMode` = `"hardpoint" | "snd" | "overload"`）
- スタッツは `game_stats`（自チーム）と `opponent_game_stats`（相手）の**両方**に同じフィールドが存在する
- DBはSupabase。スキーマ変更はマイグレーションが必要（このリポジトリにmigrationsディレクトリは無いため、Supabase MCP / ダッシュボードで適用）

## 手順

1. **DBスキーマ**: `game_stats` と `opponent_game_stats` の両テーブルに `nullable` なカラムを追加する。
   - Supabase MCP の `apply_migration` を使う。命名は `add_<field>_to_game_stats` 等。
   - 既存行があるため `NOT NULL` にせず、デフォルトは `null` か `0` を検討。

2. **型定義** (`src/lib/types.ts`): `GameStat` と `OpponentGameStat` の両interfaceに `<field>: number | null;` を追加。モード別なので `number | null` が基本。

3. **スタッツテーブル** (`src/components/stats-table.tsx`): モードに応じた列表示を追加。`mode === "snd"` 等の分岐に新フィールドの列・集計を加える。dnd-kit の列定義と整合させる。

4. **入力フォーム**: 試合作成・編集（`src/app/(authenticated)/matches/` 配下）でモード別入力欄を追加。`src/components/ui/numeric-input.tsx` 等の既存UIを再利用。

5. **保存処理 (Server Action / クエリ)**: `insert`/`update` のペイロードに新フィールドを含める。**`team_id` フィルタ/付与を必ず維持**（マルチテナンシー規約）。

6. **集計・ダッシュボード**: K/D等の集計に絡む場合 `src/app/(authenticated)/page.tsx` や関連コンポーネントの計算も更新。

7. **検証**:
   - `npm run typecheck` で型エラーなし
   - `npm run lint` でエラーなし
   - `npm run dev` で該当モードの試合を作成→表示まで確認

## 注意

- `game_stats` と `opponent_game_stats` の**両方**を必ず対応する（片方漏れが頻発する）
- モード別フィールドは他モードでは `null` のままにする（UIでも非表示）
- 変更後は `supabase-rls-reviewer` サブエージェントでデータアクセスの `team_id` 整合をレビューすると安全
