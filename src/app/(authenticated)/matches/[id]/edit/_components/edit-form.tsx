"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidYoutubeUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { arrayMove } from "@dnd-kit/sortable";
import { GameCard } from "@/app/(authenticated)/matches/_components/game-card";
import {
  calcResult,
  emptyStats,
  type StatInput,
  type GameInput,
} from "@/app/(authenticated)/matches/_components/series-form-shared";
import type {
  GameMode,
  SeriesType,
  Opponent,
  Player,
  MapEntry,
  Series,
  Game,
  GameStat,
  OpponentGameStat,
} from "@/lib/types";

interface DbStatRow {
  player_id?: string;
  opponent_player_id?: string;
  kills?: number;
  deaths?: number;
  damage?: number;
  hill_time?: number | null;
  plants?: number | null;
  defuses?: number | null;
  first_bloods?: number | null;
  first_deaths?: number | null;
  goals?: number | null;
}

type GameWithStats = Game & {
  game_stats: GameStat[];
  opponent_game_stats: OpponentGameStat[];
};

type SeriesWithGames = Series & {
  games: GameWithStats[];
};

function padStats(stats: StatInput[]): StatInput[] {
  const result = [...stats];
  while (result.length < 4) result.push(emptyStats());
  return result.slice(0, 4);
}

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
  };
}

interface EditSeriesFormProps {
  series: SeriesWithGames;
  opponents: Opponent[];
  players: Player[];
  maps: MapEntry[];
  teamId: string;
}

export function EditSeriesForm({
  series,
  opponents,
  players,
  maps,
  teamId,
}: EditSeriesFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [seriesType, setSeriesType] = useState<SeriesType>(series.type);
  const [seriesDate, setSeriesDate] = useState(series.series_date);

  const [opponentId, setOpponentId] = useState(series.opponent_id);
  const [memo, setMemo] = useState(series.memo ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(series.youtube_url ?? "");

  const initGames = (): GameInput[] =>
    (series.games ?? [])
      .sort((a, b) => a.game_number - b.game_number)
      .map((g) => ({
        mode: g.mode as GameMode,
        map_id: g.map_id ?? "",
        score_team: String(g.score_team),
        score_opponent: String(g.score_opponent),
        hill_times: (() => {
          const ht = g.hill_times;
          if (!ht) return { team: [[]], opponent: [[]], winner: [[]] };
          if (Array.isArray(ht)) {
            // 旧フラット配列形式
            return {
              team: [(ht as number[]).map(String)],
              opponent: [[]],
              winner: [[]],
            };
          }
          if (
            Array.isArray(ht.team) &&
            ht.team.length > 0 &&
            !Array.isArray(ht.team[0])
          ) {
            // { team: number[], opponent: number[] } 形式（1次元）
            return {
              team: [(ht.team as unknown as number[]).map(String)],
              opponent: [(ht.opponent as unknown as number[]).map(String)],
              winner: [[]],
            };
          }
          // { team: number[][], opponent: number[][] } 形式（2次元）
          return {
            team: ((ht.team as number[][]) ?? [[]]).map((r) => r.map(String)),
            opponent: ((ht.opponent as number[][]) ?? [[]]).map((r) =>
              r.map(String),
            ),
            winner: (ht.winner as ("team" | "opponent" | null)[][]) ?? [[]],
          };
        })(),
        stats: padStats((g.game_stats ?? []).map(dbStatToInput)),
        opponent_stats: padStats(
          (g.opponent_game_stats ?? []).map(dbStatToInput),
        ),
        expanded: false,
        id: crypto.randomUUID(),
      }));

  const [games, setGames] = useState<GameInput[]>(initGames);

  const addGame = () => {
    const pad = (stats: StatInput[]) => {
      const r = [...stats];
      while (r.length < 4) r.push(emptyStats());
      return r.slice(0, 4);
    };
    const lastGame = games.length > 0 ? games[games.length - 1] : null;

    const defaultStats = lastGame
      ? pad(
          lastGame.stats.map((s) => ({
            ...emptyStats(),
            player_id: s.player_id,
          })),
        )
      : pad(
          players
            .filter((p) => p.is_default)
            .map((p) => ({ ...emptyStats(), player_id: p.id })),
        );

    const defaultOpponentStats = lastGame
      ? pad(
          lastGame.opponent_stats.map((s) => ({
            ...emptyStats(),
            player_id: s.player_id,
          })),
        )
      : pad(
          (opponents.find((o) => o.id === opponentId)?.opponent_players ?? [])
            .filter((p) => p.is_default)
            .map((p) => ({ ...emptyStats(), player_id: p.id })),
        );

    setGames([
      ...games,
      {
        id: crypto.randomUUID(),
        mode: "hardpoint",
        map_id: "",
        score_team: "",
        score_opponent: "",
        hill_times: { team: [[]], opponent: [[]], winner: [[]] },
        stats: defaultStats,
        opponent_stats: defaultOpponentStats,
        expanded: true,
      },
    ]);
  };

  const removeGame = (idx: number) =>
    setGames((prev) => prev.filter((_, i) => i !== idx));

  const updateGame = (idx: number, updates: Partial<GameInput>) =>
    setGames((prev) => prev.map((g, i) => (i === idx ? { ...g, ...updates } : g)));

  const toggleExpand = (idx: number) =>
    updateGame(idx, { expanded: !games[idx].expanded });

  const updateStat = (
    gameIdx: number,
    statIdx: number,
    updates: Partial<StatInput>,
  ) =>
    updateGame(gameIdx, {
      stats: games[gameIdx].stats.map((s, i) =>
        i === statIdx ? { ...s, ...updates } : s,
      ),
    });

  const updateOpponentStat = (
    gameIdx: number,
    statIdx: number,
    updates: Partial<StatInput>,
  ) =>
    updateGame(gameIdx, {
      opponent_stats: games[gameIdx].opponent_stats.map((s, i) =>
        i === statIdx ? { ...s, ...updates } : s,
      ),
    });

  const updateHillWinner = (
    gameIdx: number,
    roundIdx: number,
    hillIdx: number,
    value: "team" | "opponent" | null,
  ) => {
    setGames((prev) =>
      prev.map((g, i) => {
        if (i !== gameIdx) return g;
        const rows = g.hill_times.winner.map((r) => [...r]);
        while (rows.length <= roundIdx) rows.push([]);
        const row = rows[roundIdx];
        while (row.length <= hillIdx) row.push(null);
        row[hillIdx] = value;
        return { ...g, hill_times: { ...g.hill_times, winner: rows } };
      }),
    );
  };

  const updateHillTime = (
    gameIdx: number,
    side: "team" | "opponent",
    roundIdx: number,
    hillIdx: number,
    value: string,
  ) => {
    setGames((prev) =>
      prev.map((g, i) => {
        if (i !== gameIdx) return g;
        const rounds = g.hill_times[side].map((r) => [...r]);
        while (rounds.length <= roundIdx) rounds.push([]);
        const round = rounds[roundIdx];
        while (round.length <= hillIdx) round.push("");
        round[hillIdx] = value;
        return { ...g, hill_times: { ...g.hill_times, [side]: rounds } };
      }),
    );
  };

  const reorderStats = (
    gameIdx: number,
    side: "team" | "opponent",
    oldIndex: number,
    newIndex: number,
  ) => {
    setGames((prev) =>
      prev.map((g, i) => {
        if (i < gameIdx) return g;
        const key = side === "team" ? "stats" : "opponent_stats";
        if (i === gameIdx)
          return { ...g, [key]: arrayMove(g[key], oldIndex, newIndex) };
        const reorderedIds = arrayMove(
          prev[gameIdx][key],
          oldIndex,
          newIndex,
        ).map((s) => s.player_id);
        const newStats = [...g[key]];
        const sorted: typeof newStats = [];
        for (const pid of reorderedIds) {
          const idx = newStats.findIndex((s) => s.player_id === pid);
          if (idx !== -1) sorted.push(newStats.splice(idx, 1)[0]);
        }
        sorted.push(...newStats);
        return { ...g, [key]: sorted };
      }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponentId) {
      setError("対戦相手を選択してください");
      return;
    }
    if (games.length === 0) {
      setError("ゲームを1つ以上追加してください");
      return;
    }
    const trimmedUrl = youtubeUrl.trim();
    if (trimmedUrl && !isValidYoutubeUrl(trimmedUrl)) {
      setError("YouTube URLはhttps://youtube.com または https://youtu.be のURLを入力してください");
      return;
    }
    setError("");
    setLoading(true);

    const supabase = createClient();

    // 1. Update series
    const { error: seriesErr } = await supabase
      .from("series")
      .update({
        series_date: seriesDate,
        type: seriesType,
        opponent_id: opponentId,
        memo: memo.trim() || null,
        youtube_url: trimmedUrl || null,
      })
      .eq("id", series.id);
    if (seriesErr) {
      setError(seriesErr.message);
      setLoading(false);
      return;
    }

    // 2. Delete existing games (cascades to game_stats, opponent_game_stats)
    const { error: deleteErr } = await supabase
      .from("games")
      .delete()
      .eq("series_id", series.id);
    if (deleteErr) {
      setError(deleteErr.message);
      setLoading(false);
      return;
    }

    // 3. Re-insert games
    const { data: gamesData, error: gamesErr } = await supabase
      .from("games")
      .insert(
        games.map((g, idx) => ({
          series_id: series.id,
          game_number: idx + 1,
          mode: g.mode,
          map_id: g.map_id || null,
          result: calcResult(g.score_team, g.score_opponent),
          score_team: parseInt(g.score_team) || 0,
          score_opponent: parseInt(g.score_opponent) || 0,
          hill_times:
            g.mode === "hardpoint"
              ? {
                  team: g.hill_times.team.map((round) =>
                    round.map((t) => parseInt(t) || 0),
                  ),
                  opponent: g.hill_times.opponent.map((round) =>
                    round.map((t) => parseInt(t) || 0),
                  ),
                  winner: g.hill_times.winner,
                }
              : null,
          team_id: teamId,
        })),
      )
      .select("id, game_number");
    if (gamesErr || !gamesData) {
      setError(gamesErr?.message ?? "ゲーム更新失敗");
      setLoading(false);
      return;
    }

    // 4. Re-insert stats
    const statsInsert: Array<Record<string, unknown>> = [];
    const opponentStatsInsert: Array<Record<string, unknown>> = [];

    for (const [idx, game] of games.entries()) {
      const gameRecord = gamesData.find((gd) => gd.game_number === idx + 1);
      if (!gameRecord) continue;

      for (const stat of game.stats) {
        if (!stat.player_id) continue;
        statsInsert.push({
          game_id: gameRecord.id,
          player_id: stat.player_id,
          kills: parseInt(stat.kills) || 0,
          deaths: parseInt(stat.deaths) || 0,
          damage: parseInt(stat.damage) || 0,
          hill_time:
            game.mode === "hardpoint" ? parseInt(stat.hill_time) || 0 : null,
          plants: game.mode === "snd" ? parseInt(stat.plants) || 0 : null,
          defuses: game.mode === "snd" ? parseInt(stat.defuses) || 0 : null,
          first_bloods:
            game.mode === "snd" ? parseInt(stat.first_bloods) || 0 : null,
          first_deaths:
            game.mode === "snd" ? parseInt(stat.first_deaths) || 0 : null,
          goals: game.mode === "overload" ? parseInt(stat.goals) || 0 : null,
          team_id: teamId,
        });
      }

      for (const stat of game.opponent_stats) {
        if (!stat.player_id) continue;
        opponentStatsInsert.push({
          game_id: gameRecord.id,
          opponent_player_id: stat.player_id,
          kills: parseInt(stat.kills) || 0,
          deaths: parseInt(stat.deaths) || 0,
          damage: parseInt(stat.damage) || 0,
          hill_time:
            game.mode === "hardpoint" ? parseInt(stat.hill_time) || 0 : null,
          plants: game.mode === "snd" ? parseInt(stat.plants) || 0 : null,
          defuses: game.mode === "snd" ? parseInt(stat.defuses) || 0 : null,
          first_bloods:
            game.mode === "snd" ? parseInt(stat.first_bloods) || 0 : null,
          first_deaths:
            game.mode === "snd" ? parseInt(stat.first_deaths) || 0 : null,
          goals: game.mode === "overload" ? parseInt(stat.goals) || 0 : null,
          team_id: teamId,
        });
      }
    }

    if (statsInsert.length > 0) {
      const { error: statsErr } = await supabase
        .from("game_stats")
        .insert(statsInsert);
      if (statsErr) {
        setError(statsErr.message);
        setLoading(false);
        return;
      }
    }
    if (opponentStatsInsert.length > 0) {
      const { error: oppStatsErr } = await supabase
        .from("opponent_game_stats")
        .insert(opponentStatsInsert);
      if (oppStatsErr) {
        setError(oppStatsErr.message);
        setLoading(false);
        return;
      }
    }

    router.push(`/matches/${series.id}`);
    router.refresh();
  };

  const selectedOpponent = opponents.find((o) => o.id === opponentId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {/* Series info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">対戦情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-2">
              <Label>タイプ</Label>
              <Select
                value={seriesType}
                onChange={(e) => setSeriesType(e.target.value as SeriesType)}
              >
                <option value="scrim">Scrim</option>
                <option value="tournament">大会</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>日付</Label>
              <DatePicker value={seriesDate} onChange={setSeriesDate} />
            </div>
            <div className="space-y-2 col-span-1 sm:col-span-2">
              <Label>対戦相手</Label>
              <Select
                value={opponentId}
                onChange={(e) => setOpponentId(e.target.value)}
                required
              >
                <option value="">選択してください</option>
                {opponents.map((opp) => (
                  <option key={opp.id} value={opp.id}>
                    {opp.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 col-span-1 sm:col-span-2 md:col-span-4">
              <Label>YouTube URL</Label>
              <Input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <div className="space-y-2 col-span-1 sm:col-span-2 md:col-span-4">
              <Label>メモ</Label>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="メモ（任意）"
                className="h-16"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Games */}
      {games.map((game, gIdx) => (
        <GameCard
          key={game.id}
          game={game}
          gIdx={gIdx}
          maps={maps}
          players={players}
          selectedOpponent={selectedOpponent}
          onToggleExpand={toggleExpand}
          onRemove={removeGame}
          onUpdateGame={updateGame}
          onUpdateStat={updateStat}
          onUpdateOpponentStat={updateOpponentStat}
          onUpdateHillTime={updateHillTime}
          onUpdateHillWinner={updateHillWinner}
          onReorderStats={reorderStats}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addGame}
        className="w-full"
        disabled={!opponentId}
      >
        <Plus className="h-4 w-4 mr-2" /> ゲームを追加
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Spinner className="h-4 w-4 mr-2" />
              保存中...
            </>
          ) : (
            "更新"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/matches/${series.id}`)}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
