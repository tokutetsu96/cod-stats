import type { GameMode, ThirdMode, Title } from "./types";

export const modeLabel: Record<GameMode, string> = {
  hardpoint: "Hardpoint",
  snd: "S&D",
  overload: "Overload",
  hijack: "Hijack",
};

export const modeShortLabel: Record<GameMode, string> = {
  hardpoint: "HP",
  snd: "S&D",
  overload: "OL",
  hijack: "HJ",
};

export const ALL_MODES: GameMode[] = ["hardpoint", "snd", "overload", "hijack"];
export const THIRD_MODES: ThirdMode[] = ["hijack", "overload"];
export const DEFAULT_THIRD_MODE: ThirdMode = "hijack";

/** 作品で使うモード一覧。第3モードは作品ごとに Overload / Hijack を切り替える */
export function getTitleModes(title: Pick<Title, "third_mode"> | null | undefined): GameMode[] {
  return ["hardpoint", "snd", title?.third_mode ?? DEFAULT_THIRD_MODE];
}

/** モード別の試合スコア上限（未定義のモードは上限なし） */
export const MODE_SCORE_MAX: Partial<Record<GameMode, number>> = {
  hijack: 300,
};
