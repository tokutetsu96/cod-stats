// 使い方ページ（/guide）のスクリーンショットを撮り直すスクリプト。
//
// 前提:
//   - dev サーバーが起動している: npx next dev --turbopack -H 127.0.0.1
//   - .env.local にデモアカウントの GUIDE_DEMO_EMAIL / GUIDE_DEMO_PASSWORD がある
//   - Google Chrome がインストールされている（playwright-core は同梱ブラウザを持たない）
// 実行: npm run guide:capture
//
// フォームは入力するだけで送信しないので、何度実行してもデモチームのデータは変わらない。
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { DEMO_GAMES, addAndFillGame, fillSeriesInfo } from "./guide-form.mjs";

const BASE = process.env.GUIDE_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = path.resolve(import.meta.dirname, "../src/app/guide/_images");
const { GUIDE_DEMO_EMAIL: email, GUIDE_DEMO_PASSWORD: password } = process.env;
if (!email || !password) {
  console.error("GUIDE_DEMO_EMAIL / GUIDE_DEMO_PASSWORD が .env.local にありません");
  process.exit(1);
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  locale: "ja-JP",
});
const page = await context.newPage();

/** dev の Next.js インジケーターを消し、フォーカスリングとキャレットを写さない */
const prepare = async () => {
  await page.waitForLoadState("networkidle");
  // loading.tsx のスケルトンが消えるまで待つ
  await page.waitForFunction(() => !document.querySelector(".animate-pulse"));
  await page.addStyleTag({
    content: "nextjs-portal{display:none!important} *{caret-color:transparent!important}",
  });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    return document.fonts.ready;
  });
};

/** 操作対象を枠線で目立たせる */
const highlight = (locator) =>
  locator.evaluate((el) => {
    el.style.boxShadow = "0 0 0 5px var(--background), 0 0 0 8px var(--primary)";
    el.style.borderRadius = "8px";
  });

const shot = async (name, target = page) => {
  await prepare();
  await target.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`✓ ${name}.png`);
};

// 1. 新規登録（未ログイン・入力のみ）
await page.goto(`${BASE}/login`);
await page.getByRole("button", { name: "新規登録" }).click();
await page.locator("#username").fill("demo_admin");
await page.getByRole("button", { name: "新規作成" }).click();
await page.locator("#teamName").fill("Demo Wolves");
await page.locator("#email").fill("you@example.com");
await page.locator("#password").fill("password-sample");
await shot("01-signup");

// ログイン
await page.goto(`${BASE}/login`);
await page.locator("#email").fill(email);
await page.locator("#password").fill(password);
await page.locator("button[type=submit]").click();
await page.waitForURL(`${BASE}/`);

// 2. プレイヤー
await page.goto(`${BASE}/players`);
await page.getByPlaceholder("プレイヤー名").fill("Taiga");
await highlight(page.locator("form", { has: page.getByPlaceholder("プレイヤー名") }));
await shot("02-players");

// 3. マップ管理（設定ページ下部のカードだけを撮る）
await page.goto(`${BASE}/settings`);
const mapCard = page.locator("div.rounded-xl.bg-card", { hasText: "マップ管理" }).last();
await page.getByPlaceholder(/のマップ名$/).fill("Terminal");
await page.getByPlaceholder("地点数").first().fill("5");
await highlight(page.locator("form", { has: page.getByPlaceholder(/のマップ名$/) }));
await mapCard.scrollIntoViewIfNeeded();
await shot("03-maps", mapCard);

// 4. 対戦相手（選手一覧を展開）
await page.goto(`${BASE}/opponents`);
const toggle = page.locator("button", { has: page.locator("svg.lucide-users") }).first();
await toggle.click();
await page.getByPlaceholder("選手名").waitFor();
await highlight(toggle);
await shot("04-opponents");

// 5. 対戦登録（対戦情報 → ゲーム1）
await page.goto(`${BASE}/matches/new`);
await page.getByRole("button", { name: "ゲームを追加" }).waitFor();
await fillSeriesInfo(page);
await shot("05-match-info");
await addAndFillGame(page, 0, DEMO_GAMES[0]);
const gameCard = page.locator("div.rounded-xl.bg-card", { hasText: "Game 1" }).last();
await shot("06-match-game", gameCard);
await page.getByRole("button", { name: "登録", exact: true }).scrollIntoViewIfNeeded();
await highlight(page.getByRole("button", { name: "登録", exact: true }));
await shot("07-match-submit");

// 6. 結果の確認（一覧 → 詳細 → ダッシュボード）
await page.goto(`${BASE}/matches`);
const detailLink = page.locator('a[aria-label="対戦の詳細"]:visible').first();
await detailLink.waitFor();
await highlight(detailLink);
await shot("08-match-list");
await detailLink.click();
await page.waitForURL(/\/matches\/[^/]+$/);
await shot("09-match-detail");
await page.goto(`${BASE}/`);
await shot("10-dashboard");

await browser.close();
