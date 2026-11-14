import { useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { StatInput } from "@/lib/types";
import {
  emptyHillTimes,
  emptyStats,
  padStats,
  type GameInput,
} from "./series-form-shared";

type Side = "team" | "opponent";
type DefaultCandidate = { id: string; is_default: boolean };

const statsKey = (side: Side) => (side === "team" ? "stats" : "opponent_stats");

/** リストを伸ばしながら [row][col] に値を書き込んだ新しい2次元配列を返す */
function setCell<T>(grid: T[][], rowIdx: number, colIdx: number, value: T, filler: T): T[][] {
  const rows = grid.map((r) => [...r]);
  while (rows.length <= rowIdx) rows.push([]);
  const row = rows[rowIdx];
  while (row.length <= colIdx) row.push(filler);
  row[colIdx] = value;
  return rows;
}

/**
 * 対戦フォームのゲーム一覧の状態と更新関数（新規作成・編集で共通）。
 * 更新は全て関数形式の setState で行い、描画時点の古い games を参照しない。
 */
export function useGamesState(initialGames: GameInput[] | (() => GameInput[])) {
  const [games, setGames] = useState<GameInput[]>(initialGames);

  const updateGame = (idx: number, updates: Partial<GameInput>) =>
    setGames((prev) => prev.map((g, i) => (i === idx ? { ...g, ...updates } : g)));

  /** ゲームを追加する。直前のゲームがあればその選手順序を引き継ぎ、無ければデフォルト選手を並べる */
  const addGame = (players: DefaultCandidate[], opponentPlayers: DefaultCandidate[]) => {
    const id = crypto.randomUUID();
    const blank = (playerId: string): StatInput => ({ ...emptyStats(), player_id: playerId });
    const defaults = (candidates: DefaultCandidate[]) =>
      candidates.filter((p) => p.is_default).map((p) => blank(p.id));
    setGames((prev) => {
      const last = prev.at(-1);
      return [
        ...prev,
        {
          id,
          mode: "hardpoint",
          map_id: "",
          score_team: "",
          score_opponent: "",
          hill_times: emptyHillTimes(),
          stats: padStats(last ? last.stats.map((s) => blank(s.player_id)) : defaults(players)),
          opponent_stats: padStats(
            last ? last.opponent_stats.map((s) => blank(s.player_id)) : defaults(opponentPlayers),
          ),
          expanded: true,
        },
      ];
    });
  };

  const removeGame = (idx: number) => setGames((prev) => prev.filter((_, i) => i !== idx));

  const toggleExpand = (idx: number) =>
    setGames((prev) => prev.map((g, i) => (i === idx ? { ...g, expanded: !g.expanded } : g)));

  const updateStatRow =
    (side: Side) => (gameIdx: number, statIdx: number, updates: Partial<StatInput>) => {
      const key = statsKey(side);
      setGames((prev) =>
        prev.map((g, i) =>
          i === gameIdx
            ? { ...g, [key]: g[key].map((s, j) => (j === statIdx ? { ...s, ...updates } : s)) }
            : g,
        ),
      );
    };

  const updateHillTime = (
    gameIdx: number,
    side: Side,
    roundIdx: number,
    hillIdx: number,
    value: string,
  ) =>
    setGames((prev) =>
      prev.map((g, i) =>
        i === gameIdx
          ? {
              ...g,
              hill_times: {
                ...g.hill_times,
                [side]: setCell(g.hill_times[side], roundIdx, hillIdx, value, ""),
              },
            }
          : g,
      ),
    );

  const updateHillWinner = (
    gameIdx: number,
    roundIdx: number,
    hillIdx: number,
    value: Side | null,
  ) =>
    setGames((prev) =>
      prev.map((g, i) =>
        i === gameIdx
          ? {
              ...g,
              hill_times: {
                ...g.hill_times,
                winner: setCell(g.hill_times.winner, roundIdx, hillIdx, value, null),
              },
            }
          : g,
      ),
    );

  /** スタッツ行を並び替える。以降のゲームにも同じ選手順を適用する */
  const reorderStats = (gameIdx: number, side: Side, oldIndex: number, newIndex: number) => {
    const key = statsKey(side);
    setGames((prev) => {
      const reordered = arrayMove(prev[gameIdx][key], oldIndex, newIndex);
      const orderedIds = reordered.map((s) => s.player_id);
      return prev.map((g, i) => {
        if (i < gameIdx) return g;
        if (i === gameIdx) return { ...g, [key]: reordered };
        // 同じ player_id 順に並べ直す（未選択の空行は同じ位置に対応させ、該当なしの行は末尾に残す）
        const rest = [...g[key]];
        const sorted: StatInput[] = [];
        for (const pid of orderedIds) {
          const idx = rest.findIndex((s) => s.player_id === pid);
          if (idx !== -1) sorted.push(rest.splice(idx, 1)[0]);
        }
        return { ...g, [key]: [...sorted, ...rest] };
      });
    });
  };

  return {
    games,
    addGame,
    removeGame,
    updateGame,
    toggleExpand,
    updateStat: updateStatRow("team"),
    updateOpponentStat: updateStatRow("opponent"),
    updateHillTime,
    updateHillWinner,
    reorderStats,
  };
}
