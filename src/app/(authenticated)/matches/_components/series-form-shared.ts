import type { GameMode, MatchResult } from "@/lib/types";

export interface StatInput {
  player_id: string;
  kills: string;
  deaths: string;
  damage: string;
  hill_time: string;
  plants: string;
  defuses: string;
  first_bloods: string;
  first_deaths: string;
  goals: string;
}

export interface GameInput {
  mode: GameMode;
  map_id: string;
  score_team: string;
  score_opponent: string;
  hill_times: {
    team: string[][];
    opponent: string[][];
    winner: ("team" | "opponent" | null)[][];
  };
  stats: StatInput[];
  opponent_stats: StatInput[];
  expanded: boolean;
}

export function calcResult(scoreTeam: string, scoreOpponent: string): MatchResult {
  const t = parseInt(scoreTeam) || 0;
  const o = parseInt(scoreOpponent) || 0;
  if (t > o) return "win";
  if (t < o) return "lose";
  return "draw";
}

export function emptyStats(): StatInput {
  return {
    player_id: "",
    kills: "",
    deaths: "",
    damage: "",
    hill_time: "",
    plants: "",
    defuses: "",
    first_bloods: "",
    first_deaths: "",
    goals: "",
  };
}

export const resultLabel: Record<MatchResult, string> = {
  win: "WIN",
  lose: "LOSE",
  draw: "DRAW",
};

export const resultColor: Record<MatchResult, string> = {
  win: "text-green-500",
  lose: "text-red-500",
  draw: "text-yellow-500",
};

export const modeLabel: Record<GameMode, string> = {
  hardpoint: "Hardpoint",
  snd: "S&D",
  overload: "Overload",
};
