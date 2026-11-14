export type GameMode = "hardpoint" | "snd" | "overload" | "hijack";
/** 作品ごとに選ぶ第3モード（作品により Overload / Hijack のどちらか） */
export type ThirdMode = Extract<GameMode, "overload" | "hijack">;
export type MatchResult = "win" | "lose" | "draw";
export type SeriesType = "scrim" | "tournament";

/**
 * Server Action の戻り値。本番ビルドでは throw した Error の message がクライアントに届かない
 * （"Minified React error #441" に置き換わる）ため、ユーザー向けのエラーは値として返す。
 */
export type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

/** スタッツ入力フォームの1行（入力中は文字列で保持する） */
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
  uploads: string;
  dunks: string;
  remote_plants: string;
}

export interface Team {
  id: string;
  name: string;
  default_roster_size: number;
  created_at: string;
}

export type UserRole = "admin" | "member";

/** ログイン中ユーザーのプロフィール。team_id / role は「選択中チーム」での値 */
export interface Profile {
  id: string;
  username: string;
  avatar: string | null;
  team_id: string;
  role: UserRole;
  created_at: string;
}

/** ログイン中ユーザーの所属チーム（ヘッダーのチーム切り替え用） */
export interface TeamMembership {
  team_id: string;
  team_name: string;
  role: UserRole;
}

/** チーム招待コード（管理者のみ閲覧可） */
export interface TeamInvite {
  id: string;
  code: string;
  expires_at: string;
  max_uses: number | null;
  use_count: number;
  created_at: string;
}

/** 除外済みユーザー（招待コードがあっても再参加不可） */
export interface TeamBan {
  user_id: string;
  username: string;
  created_at: string;
}

/** チーム管理画面のメンバー一覧行 */
export interface TeamMember {
  user_id: string;
  username: string;
  role: UserRole;
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

/** 作品。運営側の固定プリセット（title_presets）を各チームに配布したもので、ユーザーは追加・改名・削除できない */
export interface Title {
  id: string;
  team_id: string;
  /** プリセットコード（例: "bo7", "mw4"） */
  code: string;
  name: string;
  sort_order: number;
  is_default: boolean;
  third_mode: ThirdMode;
  created_at: string;
}

export interface MapEntry {
  id: string;
  name: string;
  mode: GameMode;
  hill_count: number | null;
  team_id: string;
  title_id: string;
  created_at: string;
}

export interface Series {
  id: string;
  series_date: string;
  type: SeriesType;
  opponent_id: string;
  team_id: string;
  title_id: string;
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
  title_id: string;
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
  uploads: number | null;
  dunks: number | null;
  remote_plants: number | null;
  team_id: string;
  title_id: string;
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
  uploads: number | null;
  dunks: number | null;
  remote_plants: number | null;
  team_id: string;
  title_id: string;
  created_at: string;
  players?: Player;
}
