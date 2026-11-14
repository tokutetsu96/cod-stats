// 使い方ページ用: 対戦登録フォームにデモの値を入力する（送信はしない）。
// 撮影スクリプト scripts/capture-guide.mjs から使う。

/** ラベル文字列の直後にある select / input を返す（Label に htmlFor が無いため構造で辿る） */
const field = (page, label, tag) =>
  page.locator(`div.space-y-2:has(> label:text-is("${label}")) ${tag}`);

/** [K, D, Dmg, モード固有...] を1行ずつ。行数はデフォルト選手の4人に合わせる */
export const DEMO_GAMES = [
  {
    mode: "Hardpoint",
    map: "Harbor",
    score: ["250", "212"],
    team: [[28, 22, 3120, 74], [25, 24, 2980, 61], [22, 23, 2710, 68], [19, 25, 2440, 47]],
    opponent: [[26, 23, 3010, 58], [24, 24, 2850, 55], [23, 22, 2790, 52], [21, 25, 2600, 47]],
  },
  {
    mode: "S&D",
    map: "Citadel",
    score: ["4", "6"],
    team: [[9, 7, 1180, 1, 0, 2, 1], [7, 8, 960, 2, 1, 1, 2], [6, 8, 870, 0, 0, 1, 2], [5, 9, 720, 1, 0, 0, 1]],
    opponent: [[10, 6, 1260, 2, 1, 3, 1], [8, 7, 1010, 1, 0, 1, 1], [8, 7, 990, 1, 1, 1, 1], [6, 7, 800, 0, 0, 1, 1]],
  },
  {
    mode: "Hijack",
    map: "Outpost",
    score: ["300", "245"],
    team: [[24, 19, 2890, 3, 2, 1, 0], [22, 20, 2650, 2, 1, 2, 1], [20, 21, 2480, 1, 2, 0, 0], [18, 22, 2210, 2, 0, 1, 0]],
    opponent: [[23, 20, 2760, 2, 1, 1, 0], [21, 21, 2590, 1, 2, 1, 0], [20, 21, 2400, 2, 0, 0, 1], [18, 22, 2150, 1, 1, 0, 0]],
  },
];

/** 対戦情報カード（タイプ・対戦相手・メモ）を入力する。日付は初期値（当日）のまま */
export async function fillSeriesInfo(page, { opponent = "Team Phoenix" } = {}) {
  await field(page, "タイプ", "select").selectOption({ label: "Scrim" });
  await field(page, "対戦相手", "select").selectOption({ label: opponent });
  await field(page, "メモ", "textarea").fill("週末スクリム。Hardpoint の2周目以降のローテーションを確認する");
}

/** 「ゲームを追加」を押して idx 番目のゲームを入力する */
export async function addAndFillGame(page, idx, game) {
  await page.getByRole("button", { name: "ゲームを追加" }).click();
  const mode = field(page, "モード", "select").nth(idx);
  await mode.waitFor();
  await mode.selectOption({ label: game.mode });
  await field(page, "マップ", "select").nth(idx).selectOption({ label: game.map });
  await field(page, "自チーム", "input").nth(idx).fill(game.score[0]);
  await field(page, "相手チーム", "input").nth(idx).fill(game.score[1]);

  const tables = page.locator("table:has(th:text-is('Player'))");
  for (const [offset, rows] of [[0, game.team], [1, game.opponent]]) {
    const table = tables.nth(idx * 2 + offset);
    for (const [r, values] of rows.entries()) {
      const inputs = table.locator("tbody tr").nth(r).locator('input[type="number"]');
      for (const [c, v] of values.entries()) await inputs.nth(c).fill(String(v));
    }
  }
}
