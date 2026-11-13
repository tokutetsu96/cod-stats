// ブラウザ専用: スコアボード画像を OCR してハードポイントのスタッツを返す。
// tesseract.js は重いため、このモジュール自体を動的 import して使うこと。

import type { Worker } from "tesseract.js";
import {
  cellScale,
  cleanName,
  detectTeamLines,
  hardpointCells,
  parseClockSeconds,
  parseInteger,
  parseKillsDeaths,
  preprocessCell,
  type RawImage,
  type Rect,
} from "./layout";

export interface ScoreboardRow {
  name: string;
  kills: number | null;
  deaths: number | null;
  damage: number | null;
  /** 秒 */
  hillTime: number | null;
}

export interface HardpointScoreboard {
  /** [A チーム（上段）, B チーム（下段）] */
  teams: [ScoreboardRow[], ScoreboardRow[]];
  /** [A, B] */
  scores: [number | null, number | null];
}

export class ScoreboardReadError extends Error {}

interface Workers {
  digits: Worker;
  names: Worker;
}

// ページ滞在中はワーカーを使い回す（言語データの再読み込みを避ける）
let workersPromise: Promise<Workers> | null = null;

function getWorkers(): Promise<Workers> {
  if (!workersPromise) {
    workersPromise = (async () => {
      const { createWorker, PSM } = await import("tesseract.js");
      const [digits, names] = await Promise.all([
        createWorker("eng"),
        createWorker(["jpn", "eng"]),
      ]);
      await Promise.all([
        digits.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_LINE,
          tessedit_char_whitelist: "0123456789/:",
        }),
        names.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE }),
      ]);
      return { digits, names };
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

export async function readHardpointScoreboard(blob: Blob): Promise<HardpointScoreboard> {
  const [img, workers] = await Promise.all([loadImage(blob), getWorkers()]);

  const lines = detectTeamLines(img);
  if (!lines) {
    throw new ScoreboardReadError(
      "スコアボードを検出できませんでした。試合終了後のスコアボード全体が写った画像を使用してください",
    );
  }
  const cells = hardpointCells(lines);
  const scale = cellScale(cells.unit);

  const read = async (worker: Worker, rect: Rect) => {
    const { data } = await worker.recognize(toCanvas(preprocessCell(img, rect, scale)));
    return data.text.trim();
  };

  // ワーカーごとにジョブはキューイングされるので、まとめて投げて並列化する
  const readTeam = (rows: (typeof cells.teams)[number]) =>
    Promise.all(
      rows.map(async (row): Promise<ScoreboardRow> => {
        const [name, kd, damage, hillTime] = await Promise.all([
          read(workers.names, row.name),
          read(workers.digits, row.kd),
          read(workers.digits, row.damage),
          read(workers.digits, row.hillTime),
        ]);
        return {
          name: cleanName(name),
          ...parseKillsDeaths(kd),
          damage: parseInteger(damage),
          hillTime: parseClockSeconds(hillTime),
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
    teams: [teamA, teamB],
    scores: [parseInteger(scoreA), parseInteger(scoreB)],
  };
}
