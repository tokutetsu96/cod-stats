"use client";

import { useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { GameCard } from "@/app/(authenticated)/matches/_components/game-card";
import {
  buildSeriesPayload,
  emptyHillTimes,
  emptyStats,
  padStats,
  type GameInput,
} from "@/app/(authenticated)/matches/_components/series-form-shared";
import type { MapEntry, Opponent, Player, StatInput } from "@/lib/types";

const meta = { team_id: "dev", created_at: "2026-01-01T00:00:00Z" };

// 並び順は画像と変えてあり、名前一致での行割り当てを確認できるようにしている
const PLAYERS: Player[] = [
  { id: "p-chan", name: "れつじろうちゃん", is_default: true, is_active: true, ...meta },
  { id: "p-zilean", name: "Zilean", is_default: true, is_active: true, ...meta },
  { id: "p-retsu", name: "烈二郎", is_default: true, is_active: true, ...meta },
  { id: "p-san", name: "れつじろうさん", is_default: true, is_active: true, ...meta },
  { id: "p-sub", name: "補欠プレイヤー", is_default: false, is_active: true, ...meta },
];

// Xsisuy は未登録 → 未一致警告の確認用
const OPPONENT: Opponent = {
  id: "opp",
  name: "テスト対戦相手",
  memo: null,
  ...meta,
  opponent_players: [
    { id: "o-3wee", opponent_id: "opp", name: "3wee", is_default: true, ...meta },
    { id: "o-px", opponent_id: "opp", name: "Px", is_default: true, ...meta },
    { id: "o-destroy", opponent_id: "opp", name: "Destroy", is_default: true, ...meta },
  ],
};

const MAPS: MapEntry[] = [
  { id: "m-sentry", name: "セントリー", mode: "hardpoint", hill_count: 5, title_id: "dev", ...meta },
];

function initialGame(): GameInput {
  return {
    id: "dev-game",
    mode: "hardpoint",
    map_id: "m-sentry",
    score_team: "",
    score_opponent: "",
    hill_times: emptyHillTimes(),
    stats: padStats(PLAYERS.filter((p) => p.is_default).map((p) => ({ ...emptyStats(), player_id: p.id }))),
    opponent_stats: padStats(
      (OPPONENT.opponent_players ?? []).map((p) => ({ ...emptyStats(), player_id: p.id })),
    ),
    expanded: true,
  };
}

export function ScoreboardPreview() {
  const [game, setGame] = useState<GameInput>(initialGame);

  const update = (updates: Partial<GameInput>) => setGame((g) => ({ ...g, ...updates }));
  const updateSide =
    (key: "stats" | "opponent_stats") => (_: number, sIdx: number, u: Partial<StatInput>) =>
      setGame((g) => ({ ...g, [key]: g[key].map((s, i) => (i === sIdx ? { ...s, ...u } : s)) }));

  const payload = buildSeriesPayload({
    seriesDate: "2026-01-01",
    seriesType: "scrim",
    opponentId: OPPONENT.id,
    memo: "",
    youtubeUrl: "",
    games: [game],
  }).games[0];

  return (
    <div className="space-y-6">
      <GameCard
        game={game}
        gIdx={0}
        maps={MAPS}
        modes={["hardpoint", "snd", "overload"]}
        players={PLAYERS}
        selectedOpponent={OPPONENT}
        onToggleExpand={() => update({ expanded: !game.expanded })}
        onRemove={() => setGame(initialGame())}
        onUpdateGame={(_, u) => update(u)}
        onUpdateStat={updateSide("stats")}
        onUpdateOpponentStat={updateSide("opponent_stats")}
        onUpdateHillTime={() => {}}
        onUpdateHillWinner={() => {}}
        onReorderStats={(_, side, oldIdx, newIdx) => {
          const key = side === "team" ? "stats" : "opponent_stats";
          setGame((g) => ({ ...g, [key]: arrayMove(g[key], oldIdx, newIdx) }));
        }}
      />
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">保存ペイロード（確認用）</summary>
        <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs" data-testid="payload">
          {JSON.stringify(
            {
              score_team: payload.score_team,
              score_opponent: payload.score_opponent,
              stats: payload.stats,
              opponent_stats: payload.opponent_stats,
            },
            null,
            2,
          )}
        </pre>
      </details>
    </div>
  );
}
