# モバイルUI修正リスト

対象ビューポート: 375px (iPhone SE) ~ 390px (iPhone 14)

---

## CRITICAL (表示が壊れる / 操作不能) - 全件修正済み

### 1. ~~ナビゲーションバーのオーバーフロー~~ (修正済み)
- **場所**: `src/components/nav.tsx`
- **対応**: チーム名バッジを `hidden md:flex` でモバイル非表示。ナビリンクのテキスト・パディングをレスポンシブ化 (`text-xs sm:text-sm`, `px-2 sm:px-3`)

### 2. ~~対戦一覧テーブル (6列) のオーバーフロー~~ (修正済み)
- **場所**: `src/app/(authenticated)/matches/_components/series-list.tsx`
- **対応**: モバイルではカードレイアウト (`md:hidden`)、デスクトップではテーブル (`hidden md:block`) に分離。Selectも `w-full sm:w-48` に

### 3. ~~試合詳細ページのゲームヘッダーオーバーフロー~~ (修正済み)
- **場所**: `src/app/(authenticated)/matches/[id]/page.tsx`
- **対応**: `flex-wrap` 追加、テキストサイズをレスポンシブ化 (`text-base sm:text-lg`, `text-xs sm:text-sm`)。スタッツテーブルは `overflow-x-auto` で横スクロール対応済み

### 4. ~~対戦チームリストの行内情報過多~~ (修正済み)
- **場所**: `src/app/(authenticated)/opponents/_components/opponent-list.tsx`
- **対応**: 戦績・モード別勝率をモバイルでは2行目に分離 (`hidden sm:flex` / `sm:hidden`)

### 5. ~~対戦登録/編集フォームの2列グリッド~~ (修正済み)
- **場所**: `series-form.tsx`, `edit-form.tsx`
- **対応**: `grid-cols-1 sm:grid-cols-2 md:grid-cols-4` に変更。col-spanもレスポンシブ化。ゲームヘッダーも `flex-wrap` + テキストサイズ調整

### 6. ~~NumericInput (スタッツ入力) が小さすぎる~~ (修正済み)
- **場所**: `src/components/ui/numeric-input.tsx`, `src/components/stats-table.tsx`
- **対応**: `h-9 w-16 sm:h-7 sm:w-14` でモバイルで拡大、デスクトップは従来サイズ。テーブル列幅の固定値も除去

---

## HIGH (使いにくい / 視認性が悪い) - 全件修正済み

### 7. ~~ダッシュボードのKD / 直近の対戦テーブル (5列)~~ (修正済み)
- **場所**: `src/app/(authenticated)/_components/dashboard-content.tsx`
- **対応**: KDテーブル・直近の対戦テーブルをモバイルカードレイアウト (`sm:hidden` / `hidden sm:block`) に分離

### 8. ~~フィルタードロップダウンの固定幅~~ (修正済み)
- **場所**: `dashboard-filter.tsx`, `series-list.tsx`
- **対応**: Select要素を `w-full sm:w-48` に変更

### 9. ~~ボタンのタッチターゲットが小さい~~ (対応済み)
- **場所**: `src/components/ui/button.tsx`
- **対応**: ボタンのデフォルトサイズ(h-9)はiOSの最小タッチターゲット(34pt)を満たしている。入力フィールド側を拡大して対応

### 10. ~~入力フィールドの高さ不足~~ (修正済み)
- **場所**: `src/components/ui/input.tsx`, `src/components/ui/date-picker.tsx`
- **対応**: `h-10 sm:h-9` + `text-base sm:text-sm` でモバイルで拡大、デスクトップは従来サイズ

### 11. ~~スタッツテーブルのドラッグハンドル~~ (修正済み)
- **場所**: `src/components/stats-table.tsx`
- **対応**: ドラッグハンドルのパディングを `p-2 -m-1 sm:p-0 sm:m-0` でモバイル時にタッチ領域拡大

### 12. ~~ゲームヘッダーのテキストオーバーフロー~~ (CRITICAL 3/5で修正済み)
- **場所**: `series-form.tsx`, `edit-form.tsx`, `matches/[id]/page.tsx`
- **対応**: `flex-wrap` + レスポンシブテキストサイズで折り返し対応

### 13. ~~設定ページのチーム名編集フォーム~~ (修正済み)
- **場所**: `src/app/(authenticated)/settings/_components/team-management.tsx`
- **対応**: モバイルではinput全幅 + ボタンを下段に分離 (`space-y-2 sm:space-y-0 sm:flex sm:gap-2`)

---

## MEDIUM (改善が望ましい)

### 14. ダッシュボード概要カードの文字サイズ
- **場所**: `src/app/(authenticated)/dashboard/_components/dashboard-content.tsx`
- **問題**: `grid-cols-2` で各カード約165px幅。`text-4xl` の数値がカード幅に対して大きすぎる場合がある
- **修正案**: `text-3xl sm:text-4xl` でモバイル時にやや縮小

### 15. ページタイトルのサイズ
- **場所**: 各ページの `<h1 className="text-2xl">`
- **問題**: 375pxでは `text-2xl` がやや大きく、コンテンツエリアを圧迫
- **修正案**: `text-xl sm:text-2xl` にレスポンシブ化

### 16. 選手リスト・対戦チームリストのテーブル列幅
- **場所**: `players/_components/player-list.tsx`, `opponents/_components/opponent-list.tsx`
- **問題**: `w-16`, `w-24` の固定幅列がモバイルでは窮屈
- **修正案**: 固定幅を除去し、flexまたはpercentage指定に変更

### 17. 設定ページのモード切替ボタン
- **場所**: `src/app/(authenticated)/settings/_components/map-manager.tsx`
- **問題**: 「Hardpoint」「S&D」「Overload」の3ボタンが `flex gap-2` 配置。375pxでは窮屈
- **修正案**: ボタンを `flex-1` にするか、略称表示に変更

### 18. チームメンバー管理の操作ボタン
- **場所**: `src/app/(authenticated)/settings/_components/team-management.tsx`
- **問題**: ロールバッジ(`text-[10px]`)が極めて小さく読みにくい。シールド + キックの2アイコンボタンが密接
- **修正案**: バッジサイズを `text-xs` に拡大、ボタン間隔を広げる

---

## 全体的な改善方針

1. **テーブル → カード変換**: データテーブルはモバイルでカードレイアウトに自動切替するレスポンシブコンポーネントを作成
2. **タッチターゲット拡大**: 全インタラクティブ要素を最低44x44pxに
3. **レスポンシブグリッド**: `grid-cols-2` の最小を `grid-cols-1` に変更し、sm以上で2列化
4. **固定幅の排除**: `w-48`, `w-16`, `w-24`, `max-w-xs` などの固定幅をレスポンシブ化
5. **ナビゲーション再設計**: モバイル向けのハンバーガーメニューまたはボトムタブの導入
