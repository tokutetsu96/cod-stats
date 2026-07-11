import type { GameMode, MatchResult, SeriesType } from "@/lib/types";

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
  id: string;
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

// save_series_with_games RPC に渡すペイロード。
// team_id / result / game_number はサーバー側（RPC）で導出するため含めない。
interface StatPayloadBase {
  kills: number;
  deaths: number;
  damage: number;
  hill_time: number;
  plants: number;
  defuses: number;
  first_bloods: number;
  first_deaths: number;
  goals: number;
}

export interface GamePayload {
  mode: GameMode;
  map_id: string | null;
  score_team: number;
  score_opponent: number;
  hill_times: {
    team: number[][];
    opponent: number[][];
    winner: ("team" | "opponent" | null)[][];
  } | null;
  stats: (StatPayloadBase & { player_id: string })[];
  opponent_stats: (StatPayloadBase & { opponent_player_id: string })[];
}

export interface SeriesPayload {
  series: {
    series_date: string;
    type: SeriesType;
    opponent_id: string;
    memo: string | null;
    youtube_url: string | null;
  };
  games: GamePayload[];
}

const num = (v: string) => parseInt(v) || 0;

function statNumbers(s: StatInput, mode: GameMode): StatPayloadBase {
  return {
    kills: num(s.kills),
    deaths: num(s.deaths),
    damage: num(s.damage),
    hill_time: mode === "hardpoint" ? num(s.hill_time) : 0,
    plants: mode === "snd" ? num(s.plants) : 0,
    defuses: mode === "snd" ? num(s.defuses) : 0,
    first_bloods: mode === "snd" ? num(s.first_bloods) : 0,
    first_deaths: mode === "snd" ? num(s.first_deaths) : 0,
    goals: mode === "overload" ? num(s.goals) : 0,
  };
}

export function buildSeriesPayload(args: {
  seriesDate: string;
  seriesType: SeriesType;
  opponentId: string;
  memo: string;
  youtubeUrl: string;
  games: GameInput[];
}): SeriesPayload {
  return {
    series: {
      series_date: args.seriesDate,
      type: args.seriesType,
      opponent_id: args.opponentId,
      memo: args.memo.trim() || null,
      youtube_url: args.youtubeUrl.trim() || null,
    },
    games: args.games.map((g) => ({
      mode: g.mode,
      map_id: g.map_id || null,
      score_team: num(g.score_team),
      score_opponent: num(g.score_opponent),
      hill_times:
        g.mode === "hardpoint"
          ? {
              team: g.hill_times.team.map((round) => round.map(num)),
              opponent: g.hill_times.opponent.map((round) => round.map(num)),
              winner: g.hill_times.winner,
            }
          : null,
      stats: g.stats
        .filter((s) => s.player_id)
        .map((s) => ({ player_id: s.player_id, ...statNumbers(s, g.mode) })),
      opponent_stats: g.opponent_stats
        .filter((s) => s.player_id)
        .map((s) => ({
          opponent_player_id: s.player_id,
          ...statNumbers(s, g.mode),
        })),
    })),
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

export { modeLabel } from "@/lib/constants";
