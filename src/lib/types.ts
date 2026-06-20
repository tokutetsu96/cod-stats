export type GameMode = "hardpoint" | "snd" | "overload";
export type MatchResult = "win" | "lose" | "draw";
export type SeriesType = "scrim" | "tournament";

export interface Team {
  id: string;
  name: string;
  default_roster_size: number;
  created_at: string;
}

export type UserRole = "admin" | "member";

export interface Profile {
  id: string;
  username: string;
  avatar: string | null;
  team_id: string;
  role: UserRole;
  created_at: string;
}

export interface Player {
  id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  team_id: string;
  created_at: string;
}

export interface Opponent {
  id: string;
  name: string;
  memo: string | null;
  team_id: string;
  created_at: string;
  opponent_players?: OpponentPlayer[];
}

export interface OpponentPlayer {
  id: string;
  opponent_id: string;
  name: string;
  is_default: boolean;
  team_id: string;
  created_at: string;
}

export interface MapEntry {
  id: string;
  name: string;
  mode: GameMode;
  hill_count: number | null;
  team_id: string;
  created_at: string;
}

export interface Series {
  id: string;
  series_date: string;
  type: SeriesType;
  opponent_id: string;
  team_id: string;
  memo: string | null;
  youtube_url: string | null;
  created_at: string;
  opponents?: Opponent;
  games?: Game[];
}

export interface Game {
  id: string;
  series_id: string;
  game_number: number;
  mode: GameMode;
  map_id: string | null;
  result: MatchResult;
  score_team: number;
  score_opponent: number;
  hill_times: { team: number[][]; opponent: number[][]; winner?: ("team" | "opponent" | null)[][] } | null;
  team_id: string;
  created_at: string;
  maps?: MapEntry;
  game_stats?: GameStat[];
  opponent_game_stats?: OpponentGameStat[];
}

export interface OpponentGameStat {
  id: string;
  game_id: string;
  opponent_player_id: string;
  kills: number;
  deaths: number;
  damage: number;
  hill_time: number | null;
  plants: number | null;
  defuses: number | null;
  first_bloods: number | null;
  first_deaths: number | null;
  goals: number | null;
  team_id: string;
  created_at: string;
  opponent_players?: OpponentPlayer;
}

export interface GameStat {
  id: string;
  game_id: string;
  player_id: string;
  kills: number;
  deaths: number;
  damage: number;
  hill_time: number | null;
  plants: number | null;
  defuses: number | null;
  first_bloods: number | null;
  first_deaths: number | null;
  goals: number | null;
  team_id: string;
  created_at: string;
  players?: Player;
}
