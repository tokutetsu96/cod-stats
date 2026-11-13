// スコアボード画像の解析（DOM 非依存の純粋関数のみ）
//
// 座標はすべて「チーム区切り線（A の下線）」を基準にした比率で表す。
// - 原点: A チーム区切り線の左端
// - 単位: 区切り線の長さ（L）
// これにより解像度・レターボックス・表示位置の違いを吸収する。

export interface RawImage {
  width: number;
  height: number;
  /** RGBA 配列 */
  data: Uint8ClampedArray | Uint8Array;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TeamLine {
  y: number;
  x0: number;
  x1: number;
}

export type HardpointCellKind = "name" | "kd" | "damage" | "hillTime";

interface Span {
  from: number;
  to: number;
}

/** CDL ハードポイントのスコアボードレイアウト（単位: 区切り線長 L） */
const HARDPOINT_LAYOUT = {
  /** 区切り線から 1 行目中心までの距離 */
  rowFirstOffset: 0.0205,
  /** 行の間隔 */
  rowPitch: 0.0369,
  /** 切り出す行の半分の高さ */
  rowHalfHeight: 0.0125,
  rowsPerTeam: 4,
  columns: {
    name: { from: 0.075, to: 0.29 },
    kd: { from: 0.297, to: 0.35 },
    damage: { from: 0.559, to: 0.608 },
    hillTime: { from: 0.639, to: 0.686 },
  } satisfies Record<HardpointCellKind, Span>,
  /** 上部スコア（A 区切り線からの相対位置） */
  score: {
    /**
     * 縦位置は画面の縦横比で変わる（16:10 と 16:9 で表との間隔が違う）ため、
     * この範囲内で数字の行を探す。y は検出できなかったときの既定値
     */
    searchY: { from: -0.25, to: -0.04 },
    y: { from: -0.135, to: -0.094 },
    teamA: { from: 0.35, to: 0.43 },
    teamB: { from: 0.51, to: 0.584 },
  },
} as const;

/**
 * 横方向に長く伸びる高彩度の線（チームカラーの区切り線）を上から 2 本検出する。
 * 色相には依存しない（自チーム側の配色が入れ替わっても検出できる）。
 */
export function detectTeamLines(img: RawImage): [TeamLine, TeamLine] | null {
  const { width, height, data } = img;
  const minRun = width * 0.3;
  const candidates: (TeamLine & { count: number })[] = [];

  for (let y = 0; y < height; y++) {
    let count = 0;
    let x0 = -1;
    let x1 = -1;
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const i = rowOffset + x * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max > 140 && max - min > 80) {
        count++;
        if (x0 < 0) x0 = x;
        x1 = x;
      }
    }
    if (count > minRun) candidates.push({ y, x0, x1, count });
  }

  // 連続する行をグループ化し、各グループで最も強い行を代表にする
  const lines: TeamLine[] = [];
  let group: (TeamLine & { count: number })[] = [];
  const flush = () => {
    if (group.length === 0) return;
    const best = group.reduce((a, b) => (b.count > a.count ? b : a));
    const ys = group.map((g) => g.y);
    lines.push({
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
      x0: best.x0,
      x1: best.x1,
    });
    group = [];
  };
  for (const c of candidates) {
    if (group.length > 0 && c.y - group[group.length - 1].y > 3) flush();
    group.push(c);
  }
  flush();

  if (lines.length < 2) return null;
  return [lines[0], lines[1]];
}

function spanRect(
  line: TeamLine,
  unit: number,
  xSpan: Span,
  centerY: number,
  halfH: number,
): Rect {
  const x = line.x0 + xSpan.from * unit;
  const w = (xSpan.to - xSpan.from) * unit;
  return {
    x: Math.round(x),
    y: Math.round(centerY - halfH),
    w: Math.round(w),
    h: Math.round(halfH * 2),
  };
}

export interface HardpointCells {
  /** teams[teamIdx][rowIdx][kind] */
  teams: [Record<HardpointCellKind, Rect>[], Record<HardpointCellKind, Rect>[]];
  scores: [Rect, Rect];
  /** 区切り線長（前処理の拡大率計算に使う） */
  unit: number;
}

/** スコアの数字とみなす明るさ（暗いボックスに白文字） */
const SCORE_TEXT_LUMINANCE = 170;

/**
 * A 区切り線より上で、スコア列に明るい文字が並ぶ行のまとまりを探し、最も背の高いもの
 * （= スコアの数字。下の「CDLハードポイント」ラベルより大きい）の縦範囲を返す。
 */
function locateScoreBand(
  img: RawImage,
  line: TeamLine,
  unit: number,
): { top: number; bottom: number } | null {
  const S = HARDPOINT_LAYOUT.score;
  const yFrom = Math.max(0, Math.round(line.y + S.searchY.from * unit));
  const yTo = Math.min(img.height - 1, Math.round(line.y + S.searchY.to * unit));
  const xRanges = [S.teamA, S.teamB].map((span) => [
    Math.max(0, Math.round(line.x0 + span.from * unit)),
    Math.min(img.width - 1, Math.round(line.x0 + span.to * unit)),
  ]);
  // 1px 程度のノイズで行が繋がらないよう、最低限の画素数を要求する
  const minPixels = Math.max(2, Math.round(unit * 0.002));
  const maxGap = Math.max(1, Math.round(unit * 0.002));

  let best: { top: number; bottom: number } | null = null;
  let runTop = -1;
  let runBottom = -1;
  const flush = () => {
    if (runTop >= 0 && (!best || runBottom - runTop > best.bottom - best.top)) {
      best = { top: runTop, bottom: runBottom };
    }
    runTop = -1;
  };

  for (let y = yFrom; y <= yTo; y++) {
    let count = 0;
    for (const [x0, x1] of xRanges) {
      for (let x = x0; x <= x1; x++) {
        const i = (y * img.width + x) * 4;
        const lum = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
        if (lum > SCORE_TEXT_LUMINANCE) count++;
      }
    }
    if (count >= minPixels) {
      if (runTop >= 0 && y - runBottom > maxGap + 1) flush();
      if (runTop < 0) runTop = y;
      runBottom = y;
    }
  }
  flush();

  // 数字として小さすぎる（ラベルや記号のみ）場合は見つからなかった扱い
  const found = best as { top: number; bottom: number } | null;
  if (!found || found.bottom - found.top < unit * 0.012) return null;
  return found;
}

export function hardpointCells(img: RawImage, lines: [TeamLine, TeamLine]): HardpointCells {
  const L = HARDPOINT_LAYOUT;
  const unit = lines[0].x1 - lines[0].x0;
  const halfH = L.rowHalfHeight * unit;

  const teamRows = (line: TeamLine) =>
    Array.from({ length: L.rowsPerTeam }, (_, r) => {
      const cy = line.y + (L.rowFirstOffset + L.rowPitch * r) * unit;
      return {
        name: spanRect(line, unit, L.columns.name, cy, halfH),
        kd: spanRect(line, unit, L.columns.kd, cy, halfH),
        damage: spanRect(line, unit, L.columns.damage, cy, halfH),
        hillTime: spanRect(line, unit, L.columns.hillTime, cy, halfH),
      };
    });

  const band = locateScoreBand(img, lines[0], unit);
  const scoreCy = band
    ? (band.top + band.bottom) / 2
    : lines[0].y + ((L.score.y.from + L.score.y.to) / 2) * unit;
  // 数字の上下に余白を足して切り出す（Tesseract は文字が枠に接すると誤読しやすい）
  const scoreHalfH = band
    ? ((band.bottom - band.top) / 2) * 1.5
    : ((L.score.y.to - L.score.y.from) / 2) * unit;

  return {
    teams: [teamRows(lines[0]), teamRows(lines[1])],
    scores: [
      spanRect(lines[0], unit, L.score.teamA, scoreCy, scoreHalfH),
      spanRect(lines[0], unit, L.score.teamB, scoreCy, scoreHalfH),
    ],
    unit,
  };
}

/** 大津の二値化しきい値 */
function otsuThreshold(hist: number[], total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/**
 * セルを切り出し → グレースケール → 拡大 → 二値化（白背景・黒文字）→ 余白追加。
 * ゲーム UI は暗い背景に明るい文字なので反転して Tesseract が得意な形にする。
 */
export function preprocessCell(
  img: RawImage,
  rect: Rect,
  scale: number,
  padding = 12,
): RawImage {
  const sx = Math.max(0, rect.x);
  const sy = Math.max(0, rect.y);
  const sw = Math.min(img.width - sx, rect.w);
  const sh = Math.min(img.height - sy, rect.h);

  const lum = new Float32Array(sw * sh);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = ((sy + y) * img.width + (sx + x)) * 4;
      lum[y * sw + x] =
        0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
    }
  }

  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));
  const scaled = new Uint8Array(dw * dh);
  const hist = new Array<number>(256).fill(0);
  for (let y = 0; y < dh; y++) {
    // バイリニア補間
    const fy = Math.min(sh - 1, (y + 0.5) / scale - 0.5);
    const y0 = Math.max(0, Math.floor(fy));
    const y1 = Math.min(sh - 1, y0 + 1);
    const ty = Math.max(0, fy - y0);
    for (let x = 0; x < dw; x++) {
      const fx = Math.min(sw - 1, (x + 0.5) / scale - 0.5);
      const x0 = Math.max(0, Math.floor(fx));
      const x1 = Math.min(sw - 1, x0 + 1);
      const tx = Math.max(0, fx - x0);
      const top = lum[y0 * sw + x0] * (1 - tx) + lum[y0 * sw + x1] * tx;
      const bottom = lum[y1 * sw + x0] * (1 - tx) + lum[y1 * sw + x1] * tx;
      const v = Math.round(top * (1 - ty) + bottom * ty);
      scaled[y * dw + x] = v;
      hist[v]++;
    }
  }

  const threshold = otsuThreshold(hist, dw * dh);
  const ow = dw + padding * 2;
  const oh = dh + padding * 2;
  const out = new Uint8ClampedArray(ow * oh * 4).fill(255);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const v = scaled[y * dw + x] > threshold ? 0 : 255;
      const o = ((y + padding) * ow + (x + padding)) * 4;
      out[o] = v;
      out[o + 1] = v;
      out[o + 2] = v;
    }
  }
  return { width: ow, height: oh, data: out };
}

/** 文字高さが Tesseract に適した大きさ（約 50px）になる拡大率 */
export function cellScale(unit: number): number {
  return Math.min(4, Math.max(1, 5000 / unit));
}

// ---- OCR テキストのパース ----

const nonDigit = /\D/g;

export function parseInteger(text: string): number | null {
  const digits = text.replace(nonDigit, "");
  return digits ? parseInt(digits, 10) : null;
}

const kdPattern = /(\d+)\s*\D\s*(\d+)/;

/** "14/17" → { kills: 14, deaths: 17 } */
export function parseKillsDeaths(text: string): { kills: number | null; deaths: number | null } {
  const m = text.match(kdPattern);
  if (m) return { kills: parseInt(m[1], 10), deaths: parseInt(m[2], 10) };
  return { kills: null, deaths: null };
}

const timePattern = /(\d+)\s*\D\s*(\d{2})/;

/** "2:27" → 147（秒）。コロンが読めなかった場合は下 2 桁を秒とみなす */
export function parseClockSeconds(text: string): number | null {
  const m = text.match(timePattern);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const digits = text.replace(nonDigit, "");
  if (digits.length < 2) return digits ? parseInt(digits, 10) : null;
  const sec = parseInt(digits.slice(-2), 10);
  const min = digits.length > 2 ? parseInt(digits.slice(0, -2), 10) : 0;
  return min * 60 + sec;
}

// Tesseract は日本語の文字間に空白を挟むため、CJK に隣接する空白は除去する
const cjkSpace = /([぀-ヿ㐀-鿿])\s+(?=[぀-ヿ㐀-鿿])/g;

/** "烈 二郎" → "烈二郎"、"P  x" → "P x" */
export function cleanName(text: string): string {
  return text.replace(/\s+/g, " ").replace(cjkSpace, "$1").trim();
}
