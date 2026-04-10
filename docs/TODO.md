# TODO: 地点別 Hill Time をチームごとに管理

## 背景

Hardpoint モードの地点別 Hill Time を **自チーム・相手チームそれぞれ** 記録・表示できるようにする。

現状の問題:
- `types.ts` の `hill_times` 型が `{ team: number[][]; opponent: number[][] } | null` と定義されているが、実際のコードは `number[]` のフラット配列として扱っており乖離がある
- 自チームの Hill Time しか入力・表示できない

目標の構造:
```
hill_times: {
  team: number[];     // 自チームの地点ごとの秒数 (index = 地点番号)
  opponent: number[]; // 相手チームの地点ごとの秒数
} | null
```

---

## TODO リスト

### ~~TODO-1~~: ✅ 完了 `types.ts` — hill_times 型を正しい構造に修正

**ファイル:** `src/lib/types.ts`

`Game.hill_times` の型を実装と一致する形に修正する。

```typescript
// 変更前
hill_times: { team: number[][]; opponent: number[][] } | null;

// 変更後
hill_times: { team: number[]; opponent: number[] } | null;
```

---

### ~~TODO-2~~: ✅ 完了 `series-form.tsx` — 地点別 Hill Time 入力を自チーム・相手チーム両方に対応

**ファイル:** `src/app/(authenticated)/matches/new/_components/series-form.tsx`

**変更内容:**

1. `GameInput.hill_times` の型を `string[]` → `{ team: string[]; opponent: string[] }` に変更
2. 初期値を `{ team: [], opponent: [] }` に変更
3. Hill Time 入力 UI を自チーム・相手チームの2行に変更
4. DB 保存時に `{ team: [...], opponent: [...] }` 形式で保存

```tsx
// GameInput インターフェース変更
interface GameInput {
  // ...
  hill_times: { team: string[]; opponent: string[] };
  // ...
}

// 初期値
{ mode: "hardpoint", map_id: "", score_team: "", score_opponent: "",
  hill_times: { team: [], opponent: [] }, stats: defaultStats, ... }

// UI イメージ（地点ごとに自チーム・相手チームを縦並び）
// Hill 1         Hill 2         Hill 3 ...
// [自] [   ]    [自] [   ]    [自] [   ]
// [相] [   ]    [相] [   ]    [相] [   ]

// 保存時
hill_times: g.mode === "hardpoint"
  ? { team: g.hill_times.team.map(t => parseInt(t) || 0),
      opponent: g.hill_times.opponent.map(t => parseInt(t) || 0) }
  : null,
```

---

### ~~TODO-3~~: ✅ 完了 `edit-form.tsx` — 地点別 Hill Time 入力を自チーム・相手チーム両方に対応

**ファイル:** `src/app/(authenticated)/matches/[id]/edit/_components/edit-form.tsx`

**変更内容:** TODO-2 と同様。加えてDB読み込み時の初期化も対応。

```typescript
// initGames() 内の hill_times 読み込み
hill_times: {
  team: Array.isArray(g.hill_times?.team)
    ? g.hill_times.team.map(String)
    : (Array.isArray(g.hill_times) ? g.hill_times.map(String) : []), // 旧形式互換
  opponent: Array.isArray(g.hill_times?.opponent)
    ? g.hill_times.opponent.map(String)
    : [],
},
```

---

### ~~TODO-4~~: ✅ 完了 `series-detail-content.tsx` — 地点別 Hill Time 表示をチームごとに更新

**ファイル:** `src/app/(authenticated)/matches/[id]/_components/series-detail-content.tsx`

**変更内容:**

現在の表示（自チームのみ）→ 自チーム・相手チームを並べた表示に変更。

```tsx
// 変更前: hill_times をフラット配列として扱う
game.hill_times.map((t, h) => ...)

// 変更後: team / opponent を分けて表示
// 地点別 Hill Time
// Hill 1: [自チーム名] Xs  /  [相手チーム名] Ys
// Hill 2: ...
// 合計:   [自] XXXs  /  [相] YYYs
```

---

---

### ~~TODO-5~~: ✅ 完了 — hill_times を複数ラウンド（最大3周）対応に変更

**背景:** Hardpoint は最大3周まわることがあるため、地点ごとに複数ラウンド分の Hill Time を記録できる必要がある。

**変更内容:**
- `hill_times` を `{ team: number[][]; opponent: number[][] } | null` に変更（`[roundIndex][hillIndex]`）
- フォーム: ラウンド追加/削除ボタン（最大3ラウンド）
- 編集フォーム: 旧データ形式（フラット配列・1次元オブジェクト）の互換処理
- 詳細画面: ラウンド別表示

---

## 処理順序

1. TODO-1 → 型変更（他に影響するため先に行う）
2. TODO-2 → 新規登録フォーム
3. TODO-3 → 編集フォーム
4. TODO-4 → 詳細表示

---

## 注意事項

- Supabase の `games.hill_times` カラムは `jsonb` 型のため、スキーマ変更不要
- 既存データは `hill_times` が `number[]` または `null` のため、TODO-3 の旧形式互換処理が必要
- `map-manager.tsx` の `hill_count` は変更不要（地点数の定義はそのまま使用）
