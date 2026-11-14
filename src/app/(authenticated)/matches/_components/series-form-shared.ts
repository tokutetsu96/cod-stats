import type {
  Game,
  GameMode,
  GameStat,
  MatchResult,
  OpponentGameStat,
  Series,
  SeriesType,
  StatInput,
} from "@/lib/types";
import { MODE_SCORE_MAX, modeLabel } from "@/lib/constants";
import { normalizeHillTimes } from "@/lib/utils";

export const STATS_ROWS = 4;
export const YOUTUBE_URL_ERROR =
  "YouTube URLはhttps://youtube.com または https://youtu.be のURLを入力してください";

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
    uploads: "",
    dunks: "",
    remote_plants: "",
  };
}

/** スタッツ行を既定の行数（4行）に揃える */
export function padStats(stats: StatInput[]): StatInput[] {
  const result = stats.slice(0, STATS_ROWS);
  while (result.length < STATS_ROWS) result.push(emptyStats());
  return result;
}

export function emptyHillTimes(): GameInput["hill_times"] {
  return { team: [[]], opponent: [[]], winner: [[]] };
}

/** フォームの初期値（編集時は既存シリーズから生成する） */
export interface SeriesFormValues {
  /** 編集対象のシリーズID（新規作成時は undefined） */
  seriesId?: string;
  seriesType: SeriesType;
  seriesDate: string;
  opponentId: string;
  memo: string;
  youtubeUrl: string;
  games: GameInput[];
}

type DbStatRow = Partial<
  Pick<
    GameStat,
    | "kills" | "deaths" | "damage" | "hill_time" | "plants" | "defuses"
    | "first_bloods" | "first_deaths" | "goals" | "uploads" | "dunks" | "remote_plants"
  >
> & { player_id?: string; opponent_player_id?: string };

function dbStatToInput(stat: DbStatRow): StatInput {
  return {
    player_id: stat.player_id ?? stat.opponent_player_id ?? "",
    kills: String(stat.kills ?? 0),
    deaths: String(stat.deaths ?? 0),
    damage: String(stat.damage ?? 0),
    hill_time: String(stat.hill_time ?? 0),
    plants: String(stat.plants ?? 0),
    defuses: String(stat.defuses ?? 0),
    first_bloods: String(stat.first_bloods ?? 0),
    first_deaths: String(stat.first_deaths ?? 0),
    goals: String(stat.goals ?? 0),
    uploads: String(stat.uploads ?? 0),
    dunks: String(stat.dunks ?? 0),
    remote_plants: String(stat.remote_plants ?? 0),
  };
}

type SeriesWithGames = Series & {
  games: (Game & { game_stats: GameStat[]; opponent_game_stats: OpponentGameStat[] })[];
};

/** DBのシリーズ（games + スタッツ込み）を編集フォームの初期値に変換する */
export function seriesToFormValues(series: SeriesWithGames): SeriesFormValues {
  return {
    seriesId: series.id,
    seriesType: series.type,
    seriesDate: series.series_date,
    opponentId: series.opponent_id,
    memo: series.memo ?? "",
    youtubeUrl: series.youtube_url ?? "",
    games: (series.games ?? [])
      .toSorted((a, b) => a.game_number - b.game_number)
      .map((g) => {
        // 旧データ形式の変換は normalizeHillTimes に共通化（入力欄用に文字列化）
        const ht = normalizeHillTimes(g.hill_times);
        return {
          id: g.id,
          mode: g.mode,
          map_id: g.map_id ?? "",
          score_team: String(g.score_team),
          score_opponent: String(g.score_opponent),
          hill_times: {
            team: ht.team.map((r) => r.map(String)),
            opponent: ht.opponent.map((r) => r.map(String)),
            winner: ht.winner,
          },
          stats: padStats((g.game_stats ?? []).map(dbStatToInput)),
          opponent_stats: padStats((g.opponent_game_stats ?? []).map(dbStatToInput)),
          expanded: false,
        };
      }),
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
  uploads: number;
  dunks: number;
  remote_plants: number;
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
    // plants は S&D の「プラント」と Hijack の「設置」で共用する
    plants: mode === "snd" || mode === "hijack" ? num(s.plants) : 0,
    defuses: mode === "snd" ? num(s.defuses) : 0,
    first_bloods: mode === "snd" ? num(s.first_bloods) : 0,
    first_deaths: mode === "snd" ? num(s.first_deaths) : 0,
    goals: mode === "overload" ? num(s.goals) : 0,
    uploads: mode === "hijack" ? num(s.uploads) : 0,
    dunks: mode === "hijack" ? num(s.dunks) : 0,
    remote_plants: mode === "hijack" ? num(s.remote_plants) : 0,
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
  win: "text-win",
  lose: "text-loss",
  draw: "text-primary",
};

/** スコア上限を超えるゲームがあればエラーメッセージを返す（クライアント・サーバー共通） */
export function validateScores(games: Pick<GamePayload, "mode" | "score_team" | "score_opponent">[]): string | null {
  for (const [i, g] of games.entries()) {
    const max = MODE_SCORE_MAX[g.mode];
    if (max !== undefined && (g.score_team > max || g.score_opponent > max)) {
      return `Game ${i + 1}: ${modeLabel[g.mode]} のスコアは ${max} 以下で入力してください`;
    }
  }
  return null;
}
