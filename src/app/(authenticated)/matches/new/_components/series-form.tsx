"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidYoutubeUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker, todayStr } from "@/components/ui/date-picker";
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
  SeriesType,
  Opponent,
  Player,
  MapEntry,
} from "@/lib/types";

interface SeriesFormProps {
  opponents: Opponent[];
  players: Player[];
  maps: MapEntry[];
  teamId: string;
}

export function SeriesForm({
  opponents,
  players,
  maps,
  teamId,
}: SeriesFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [seriesType, setSeriesType] = useState<SeriesType>("scrim");
  const [seriesDate, setSeriesDate] = useState(todayStr());

  const [opponentId, setOpponentId] = useState("");
  const [memo, setMemo] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [games, setGames] = useState<GameInput[]>([]);

  const addGame = () => {
    const pad = (stats: StatInput[]) => {
      const result = [...stats];
      while (result.length < 4) result.push(emptyStats());
      return result.slice(0, 4);
    };

    // 直前のゲームがあればその選手順序を引き継ぐ
    const lastGame = games.length > 0 ? games[games.length - 1] : null;

    let defaultStats: StatInput[];
    if (lastGame) {
      defaultStats = pad(
        lastGame.stats.map((s) => ({
          ...emptyStats(),
          player_id: s.player_id,
        })),
      );
    } else {
      defaultStats = pad(
        players
          .filter((p) => p.is_default)
          .map((p) => ({ ...emptyStats(), player_id: p.id })),
      );
    }

    let defaultOpponentStats: StatInput[];
    if (lastGame) {
      defaultOpponentStats = pad(
        lastGame.opponent_stats.map((s) => ({
          ...emptyStats(),
          player_id: s.player_id,
        })),
      );
    } else {
      const selectedOpponent = opponents.find((o) => o.id === opponentId);
      defaultOpponentStats = pad(
        (selectedOpponent?.opponent_players ?? [])
          .filter((p) => p.is_default)
          .map((p) => ({ ...emptyStats(), player_id: p.id })),
      );
    }

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
        // For subsequent games, apply same player_id order
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

    // 1. Create series
    const { data: seriesData, error: seriesErr } = await supabase
      .from("series")
      .insert({
        series_date: seriesDate,
        type: seriesType,
        opponent_id: opponentId,
        team_id: teamId,
        memo: memo.trim() || null,
        youtube_url: trimmedUrl || null,
      })
      .select("id")
      .single();
    if (seriesErr || !seriesData) {
      setError(seriesErr?.message ?? "シリーズ作成失敗");
      setLoading(false);
      return;
    }

    // 2. Create games
    const { data: gamesData, error: gamesErr } = await supabase
      .from("games")
      .insert(
        games.map((g, idx) => ({
          series_id: seriesData.id,
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
      setError(gamesErr?.message ?? "ゲーム作成失敗");
      setLoading(false);
      return;
    }

    // 3. Create game_stats (自チーム)
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

    router.push("/matches");
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
            "登録"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}
