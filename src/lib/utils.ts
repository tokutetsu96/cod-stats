import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calcKD(kills: number, deaths: number) {
  if (deaths === 0) return kills.toFixed(2);
  return (kills / deaths).toFixed(2);
}

const WEEKDAYS = ["\u65E5", "\u6708", "\u706B", "\u6C34", "\u6728", "\u91D1", "\u571F"];

export function isValidYoutubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      (parsed.hostname === "www.youtube.com" ||
        parsed.hostname === "youtube.com" ||
        parsed.hostname === "youtu.be")
    );
  } catch {
    return false;
  }
}

export type HillTimes = {
  team: number[][];
  opponent: number[][];
  winner: ("team" | "opponent" | null)[][];
};

/**
 * games.hill_times（jsonb）の旧データ形式を現行の2次元形式に正規化する。
 * - 旧1: フラット配列 number[] → Round1 の自チーム扱い
 * - 旧2: { team: number[], opponent: number[] }（1次元）→ Round1 扱い
 * - 現行: { team: number[][], opponent: number[][], winner?: ... }
 */
export function normalizeHillTimes(raw: unknown): HillTimes {
  if (!raw) return { team: [[]], opponent: [[]], winner: [[]] };
  if (Array.isArray(raw)) {
    return { team: [raw as number[]], opponent: [[]], winner: [[]] };
  }
  const obj = raw as {
    team?: unknown;
    opponent?: unknown;
    winner?: unknown;
  };
  if (
    Array.isArray(obj.team) &&
    obj.team.length > 0 &&
    !Array.isArray(obj.team[0])
  ) {
    return {
      team: [obj.team as number[]],
      opponent: [(obj.opponent as number[]) ?? []],
      winner: [[]],
    };
  }
  return {
    team: (obj.team as number[][]) ?? [[]],
    opponent: (obj.opponent as number[][]) ?? [[]],
    winner: (obj.winner as HillTimes["winner"]) ?? [[]],
  };
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")} (${dow})`;
}
