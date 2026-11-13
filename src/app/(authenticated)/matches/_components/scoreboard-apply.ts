import type { HardpointScoreboard, ScoreboardRow } from "@/lib/scoreboard/recognize";
import { matchNames, teamAffinity, type NameCandidate } from "@/lib/scoreboard/match";
import { emptyStats, type GameInput, type StatInput } from "./series-form-shared";

export type TeamSide = 0 | 1;

/** 自チームのプレイヤー名との一致度が高い方を自チームとみなす（同点なら上段） */
export function guessOwnSide(board: HardpointScoreboard, players: NameCandidate[]): TeamSide {
  const names = (side: TeamSide) => board.teams[side].map((r) => r.name);
  return teamAffinity(names(1), players) > teamAffinity(names(0), players) ? 1 : 0;
}

const str = (v: number | null, fallback: string) => (v === null ? fallback : String(v));

/**
 * 読み取った行を既存のスタッツ行に割り当てる。
 * 1. 名前が一致したプレイヤーの行があればそこへ
 * 2. 残りは未使用の行（プレイヤー未選択の行を優先）へ。名前が一致していればプレイヤーも設定する
 * 名前が一致しない行は既存のプレイヤー選択を残し、unmatched として返す（手動確認用）
 */
function fillStats(
  current: StatInput[],
  rows: ScoreboardRow[],
  candidates: NameCandidate[],
): { stats: StatInput[]; unmatched: string[] } {
  const stats = current.map((s) => ({ ...s }));
  while (stats.length < rows.length) stats.push(emptyStats());

  const matches = matchNames(
    rows.map((r) => r.name),
    candidates,
  );
  const used = new Set<number>();
  const pending: number[] = [];

  const write = (idx: number, row: ScoreboardRow, playerId: string | null) => {
    const s = stats[idx];
    stats[idx] = {
      ...s,
      player_id: playerId ?? s.player_id,
      kills: str(row.kills, s.kills),
      deaths: str(row.deaths, s.deaths),
      damage: str(row.damage, s.damage),
      hill_time: str(row.hillTime, s.hill_time),
    };
    used.add(idx);
  };

  rows.forEach((row, i) => {
    const id = matches[i].id;
    const idx = id ? stats.findIndex((s, j) => !used.has(j) && s.player_id === id) : -1;
    if (idx >= 0) write(idx, row, id);
    else pending.push(i);
  });

  const matchedIds = new Set(matches.flatMap((m) => (m.id ? [m.id] : [])));
  for (const i of pending) {
    let idx = stats.findIndex((s, j) => !used.has(j) && s.player_id === "");
    if (idx < 0) idx = stats.findIndex((s, j) => !used.has(j) && !matchedIds.has(s.player_id));
    if (idx < 0) continue;
    write(idx, rows[i], matches[i].id);
  }

  const unmatched = rows.flatMap((r, i) => (matches[i].id ? [] : [r.name || `${i + 1}行目`]));
  return { stats, unmatched };
}

export function applyScoreboard(args: {
  game: Pick<GameInput, "stats" | "opponent_stats" | "score_team" | "score_opponent">;
  board: HardpointScoreboard;
  ownSide: TeamSide;
  players: NameCandidate[];
  opponentPlayers: NameCandidate[];
}): { updates: Partial<GameInput>; unmatched: string[] } {
  const { game, board, ownSide, players, opponentPlayers } = args;
  const otherSide: TeamSide = ownSide === 0 ? 1 : 0;

  const own = fillStats(game.stats, board.teams[ownSide], players);
  const opp = fillStats(game.opponent_stats, board.teams[otherSide], opponentPlayers);

  return {
    updates: {
      stats: own.stats,
      opponent_stats: opp.stats,
      score_team: str(board.scores[ownSide], game.score_team),
      score_opponent: str(board.scores[otherSide], game.score_opponent),
    },
    unmatched: [...own.unmatched, ...opp.unmatched],
  };
}
