// ブラウザ専用: スコアボード画像を OCR してスタッツを返す（ハードポイント / S&D / ハイジャック）。
// tesseract.js は重いため、このモジュール自体を動的 import して使うこと。

import type { Worker } from "tesseract.js";
import {
  cellScale,
  cleanName,
  detectTeamLines,
  OBJECTIVE_COLUMNS,
  parseClockSeconds,
  parseInteger,
  parseKillsDeaths,
  preprocessCell,
  scoreboardCells,
  type ObjectiveField,
  type RawImage,
  type Rect,
  type ScoreboardMode,
} from "./layout";

export type { ObjectiveField, ScoreboardMode };

export interface ScoreboardRow {
  name: string;
  kills: number | null;
  deaths: number | null;
  damage: number | null;
  /** モード固有の値（hill_time は秒） */
  objectives: Partial<Record<ObjectiveField, number | null>>;
}

export interface Scoreboard {
  mode: ScoreboardMode;
  /** [A チーム（上段）, B チーム（下段）] */
  teams: [ScoreboardRow[], ScoreboardRow[]];
  /** [A, B] */
  scores: [number | null, number | null];
}

export class ScoreboardReadError extends Error {}

interface Workers {
  /** K/D・ダメージ・時間・スコア（1 行として読む） */
  digits: Worker;
  /** 1 桁が多い回数系の列。SINGLE_LINE だと単独の数字を読み落とすため単語として読む */
  counts: Worker;
  names: Worker;
}

// ページ滞在中はワーカーを使い回す（言語データの再読み込みを避ける）
let workersPromise: Promise<Workers> | null = null;

function getWorkers(): Promise<Workers> {
  if (!workersPromise) {
    workersPromise = (async () => {
      const { createWorker, PSM } = await import("tesseract.js");
      const [digits, counts, names] = await Promise.all([
        createWorker("eng"),
        createWorker("eng"),
        createWorker(["jpn", "eng"]),
      ]);
      await Promise.all([
        digits.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_LINE,
          tessedit_char_whitelist: "0123456789/:",
        }),
        counts.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_WORD,
          tessedit_char_whitelist: "0123456789",
        }),
        names.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE }),
      ]);
      return { digits, counts, names };
    })();
    workersPromise.catch(() => {
      workersPromise = null;
    });
  }
  return workersPromise;
}

async function loadImage(blob: Blob): Promise<RawImage> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new ScoreboardReadError("画像を読み込めませんでした");
    ctx.drawImage(bitmap, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    return { data, width, height };
  } finally {
    bitmap.close();
  }
}

function toCanvas(img: RawImage): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  canvas
    .getContext("2d")
    ?.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
  return canvas;
}

export async function readScoreboard(blob: Blob, mode: ScoreboardMode): Promise<Scoreboard> {
  const [img, workers] = await Promise.all([loadImage(blob), getWorkers()]);

  const lines = detectTeamLines(img);
  if (!lines) {
    throw new ScoreboardReadError(
      "スコアボードを検出できませんでした。試合終了後のスコアボード全体が写った画像を使用してください",
    );
  }
  const cells = scoreboardCells(img, lines, mode);
  const columns = OBJECTIVE_COLUMNS[mode];
  const scale = cellScale(cells.unit);

  const read = async (worker: Worker, rect: Rect) => {
    const { data } = await worker.recognize(toCanvas(preprocessCell(img, rect, scale)));
    return data.text.trim();
  };

  // ワーカーごとにジョブはキューイングされるので、まとめて投げて並列化する
  const readTeam = (rows: (typeof cells.teams)[number]) =>
    Promise.all(
      rows.map(async (row): Promise<ScoreboardRow> => {
        const [name, kd, damage, ...objectiveTexts] = await Promise.all([
          read(workers.names, row.name),
          read(workers.digits, row.kd),
          read(workers.digits, row.damage),
          ...row.objectives.map((rect, i) =>
            read(columns[i].format === "clock" ? workers.digits : workers.counts, rect),
          ),
        ]);
        const objectives: ScoreboardRow["objectives"] = {};
        columns.forEach((col, i) => {
          objectives[col.field] =
            col.format === "clock"
              ? parseClockSeconds(objectiveTexts[i])
              : parseInteger(objectiveTexts[i]);
        });
        return {
          name: cleanName(name),
          ...parseKillsDeaths(kd),
          damage: parseInteger(damage),
          objectives,
        };
      }),
    );

  const [teamA, teamB, scoreA, scoreB] = await Promise.all([
    readTeam(cells.teams[0]),
    readTeam(cells.teams[1]),
    read(workers.digits, cells.scores[0]),
    read(workers.digits, cells.scores[1]),
  ]);

  return {
    mode,
    teams: [teamA, teamB],
    scores: [parseInteger(scoreA), parseInteger(scoreB)],
  };
}
