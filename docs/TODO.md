# TODO

> 完了したTODO項目は削除する（チェックマークを付けるのではなく即削除）。

---

## 重要（Important）

### TODO-I2: PostCSS 脆弱性（`npm audit fix --force` 不可）

```bash
npm audit report

postcss <8.5.10
Severity: moderate（XSS via </style>）
```

`next@16.x` が内部で PostCSS に依存しており、修正には Next.js を v9.3.3 にダウングレードする破壊的変更が必要なため `--force` 実行不可。Next.js のアップデートで解消される予定。
