"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker, todayStr } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { NumericInput } from "@/components/ui/numeric-input";
import { StatsTable } from "@/components/stats-table";
import { arrayMove } from "@dnd-kit/sortable";
import type { GameMode, SeriesType, MatchResult, Opponent, Player, MapEntry } from "@/lib/types";

function calcResult(scoreTeam: string, scoreOpponent: string): MatchResult {
  const t = parseInt(scoreTeam) || 0;
  const o = parseInt(scoreOpponent) || 0;
  if (t > o) return "win";
  if (t < o) return "lose";
  return "draw";
}

const resultLabel: Record<MatchResult, string> = { win: "WIN", lose: "LOSE", draw: "DRAW" };
const resultColor: Record<MatchResult, string> = { win: "text-green-500", lose: "text-red-500", draw: "text-yellow-500" };
const modeLabel: Record<GameMode, string> = { hardpoint: "Hardpoint", snd: "S&D", overload: "Overload" };

interface StatInput {
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

interface GameInput {
  mode: GameMode;
  map_id: string;
  score_team: string;
  score_opponent: string;
  stats: StatInput[];
  opponent_stats: StatInput[];
  expanded: boolean;
}

function emptyStats(): StatInput {
  return { player_id: "", kills: "", deaths: "", damage: "", hill_time: "", plants: "", defuses: "", first_bloods: "", first_deaths: "", goals: "" };
}

interface SeriesFormProps {
  opponents: Opponent[];
  players: Player[];
  maps: MapEntry[];
  teamId: string;
}

export function SeriesForm({ opponents, players, maps, teamId }: SeriesFormProps) {
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
      defaultStats = pad(lastGame.stats.map((s) => ({ ...emptyStats(), player_id: s.player_id })));
    } else {
      defaultStats = pad(players.filter((p) => p.is_default).map((p) => ({ ...emptyStats(), player_id: p.id })));
    }

    let defaultOpponentStats: StatInput[];
    if (lastGame) {
      defaultOpponentStats = pad(lastGame.opponent_stats.map((s) => ({ ...emptyStats(), player_id: s.player_id })));
    } else {
      const selectedOpponent = opponents.find((o) => o.id === opponentId);
      defaultOpponentStats = pad((selectedOpponent?.opponent_players ?? [])
        .filter((p) => p.is_default)
        .map((p) => ({ ...emptyStats(), player_id: p.id })));
    }

    setGames([...games, { mode: "hardpoint", map_id: "", score_team: "", score_opponent: "", stats: defaultStats, opponent_stats: defaultOpponentStats, expanded: true }]);
  };

  const removeGame = (idx: number) => setGames(games.filter((_, i) => i !== idx));

  const updateGame = (idx: number, updates: Partial<GameInput>) =>
    setGames(games.map((g, i) => (i === idx ? { ...g, ...updates } : g)));

  const toggleExpand = (idx: number) => updateGame(idx, { expanded: !games[idx].expanded });

  const updateStat = (gameIdx: number, statIdx: number, updates: Partial<StatInput>) =>
    updateGame(gameIdx, { stats: games[gameIdx].stats.map((s, i) => (i === statIdx ? { ...s, ...updates } : s)) });

  const updateOpponentStat = (gameIdx: number, statIdx: number, updates: Partial<StatInput>) =>
    updateGame(gameIdx, { opponent_stats: games[gameIdx].opponent_stats.map((s, i) => (i === statIdx ? { ...s, ...updates } : s)) });

  const reorderStats = (gameIdx: number, side: "team" | "opponent", oldIndex: number, newIndex: number) => {
    setGames((prev) => prev.map((g, i) => {
      if (i < gameIdx) return g;
      const key = side === "team" ? "stats" : "opponent_stats";
      if (i === gameIdx) return { ...g, [key]: arrayMove(g[key], oldIndex, newIndex) };
      // For subsequent games, apply same player_id order
      const reorderedIds = arrayMove(prev[gameIdx][key], oldIndex, newIndex).map((s) => s.player_id);
      const newStats = [...g[key]];
      const sorted: typeof newStats = [];
      for (const pid of reorderedIds) {
        const idx = newStats.findIndex((s) => s.player_id === pid);
        if (idx !== -1) sorted.push(newStats.splice(idx, 1)[0]);
      }
      sorted.push(...newStats);
      return { ...g, [key]: sorted };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponentId) { setError("対戦相手を選択してください"); return; }
    if (games.length === 0) { setError("ゲームを1つ以上追加してください"); return; }
    setError("");
    setLoading(true);

    const supabase = createClient();

    // 1. Create series
    const { data: seriesData, error: seriesErr } = await supabase
      .from("series")
      .insert({ series_date: seriesDate, type: seriesType, opponent_id: opponentId, team_id: teamId, memo: memo.trim() || null, youtube_url: youtubeUrl.trim() || null })
      .select("id")
      .single();
    if (seriesErr || !seriesData) { setError(seriesErr?.message ?? "シリーズ作成失敗"); setLoading(false); return; }

    // 2. Create games
    const { data: gamesData, error: gamesErr } = await supabase
      .from("games")
      .insert(games.map((g, idx) => ({
        series_id: seriesData.id,
        game_number: idx + 1,
        mode: g.mode,
        map_id: g.map_id || null,
        result: calcResult(g.score_team, g.score_opponent),
        score_team: parseInt(g.score_team) || 0,
        score_opponent: parseInt(g.score_opponent) || 0,
        team_id: teamId,
      })))
      .select("id, game_number");
    if (gamesErr || !gamesData) { setError(gamesErr?.message ?? "ゲーム作成失敗"); setLoading(false); return; }

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
          hill_time: game.mode === "hardpoint" ? parseInt(stat.hill_time) || 0 : null,
          plants: game.mode === "snd" ? parseInt(stat.plants) || 0 : null,
          defuses: game.mode === "snd" ? parseInt(stat.defuses) || 0 : null,
          first_bloods: game.mode === "snd" ? parseInt(stat.first_bloods) || 0 : null,
          first_deaths: game.mode === "snd" ? parseInt(stat.first_deaths) || 0 : null,
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
          hill_time: game.mode === "hardpoint" ? parseInt(stat.hill_time) || 0 : null,
          plants: game.mode === "snd" ? parseInt(stat.plants) || 0 : null,
          defuses: game.mode === "snd" ? parseInt(stat.defuses) || 0 : null,
          first_bloods: game.mode === "snd" ? parseInt(stat.first_bloods) || 0 : null,
          first_deaths: game.mode === "snd" ? parseInt(stat.first_deaths) || 0 : null,
          goals: game.mode === "overload" ? parseInt(stat.goals) || 0 : null,
          team_id: teamId,
        });
      }
    }

    if (statsInsert.length > 0) {
      const { error: statsErr } = await supabase.from("game_stats").insert(statsInsert);
      if (statsErr) { setError(statsErr.message); setLoading(false); return; }
    }
    if (opponentStatsInsert.length > 0) {
      const { error: oppStatsErr } = await supabase.from("opponent_game_stats").insert(opponentStatsInsert);
      if (oppStatsErr) { setError(oppStatsErr.message); setLoading(false); return; }
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
              <Select value={seriesType} onChange={(e) => setSeriesType(e.target.value as SeriesType)}>
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
              <Select value={opponentId} onChange={(e) => setOpponentId(e.target.value)} required>
                <option value="">選択してください</option>
                {opponents.map((opp) => (
                  <option key={opp.id} value={opp.id}>{opp.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 col-span-1 sm:col-span-2 md:col-span-4">
              <Label>YouTube URL</Label>
              <Input type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
            </div>
            <div className="space-y-2 col-span-1 sm:col-span-2 md:col-span-4">
              <Label>メモ</Label>
              <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="メモ（任意）" className="h-16" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Games */}
      {games.map((game, gIdx) => {
        const modeMaps = maps.filter((m) => m.mode === game.mode);
        return (
          <Card key={gIdx}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <button type="button" onClick={() => toggleExpand(gIdx)} className="cursor-pointer">
                    {game.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  Game {gIdx + 1}
                  <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                    {modeLabel[game.mode]} - {game.score_team} : {game.score_opponent}
                  </span>
                  <span className={`text-xs sm:text-sm font-medium ${resultColor[calcResult(game.score_team, game.score_opponent)]}`}>
                    {resultLabel[calcResult(game.score_team, game.score_opponent)]}
                  </span>
                </CardTitle>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeGame(gIdx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            {game.expanded && (
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>モード</Label>
                    <Select value={game.mode} onChange={(e) => updateGame(gIdx, { mode: e.target.value as GameMode, map_id: "" })}>
                      <option value="hardpoint">Hardpoint</option>
                      <option value="snd">S&D</option>
                      <option value="overload">Overload</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>マップ</Label>
                    <Select value={game.map_id} onChange={(e) => updateGame(gIdx, { map_id: e.target.value })}>
                      <option value="">未選択</option>
                      {modeMaps.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>自チーム</Label>
                    <NumericInput value={game.score_team} onChange={(v) => updateGame(gIdx, { score_team: v })} className="w-full" />
                  </div>
                  <div className="space-y-2">
                    <Label>相手チーム</Label>
                    <NumericInput value={game.score_opponent} onChange={(v) => updateGame(gIdx, { score_opponent: v })} className="w-full" />
                  </div>
                </div>

                <StatsTable
                  label="自チームスタッツ"
                  mode={game.mode}
                  stats={game.stats}
                  playerOptions={players}
                  onUpdate={(sIdx, u) => updateStat(gIdx, sIdx, u)}
                  onReorder={(oldIdx, newIdx) => reorderStats(gIdx, "team", oldIdx, newIdx)}
                />

                <div className="border-t pt-4">
                  <StatsTable
                    label={`相手チームスタッツ（${selectedOpponent?.name ?? ""}）`}
                    mode={game.mode}
                    stats={game.opponent_stats}
                    playerOptions={selectedOpponent?.opponent_players ?? []}
                    onUpdate={(sIdx, u) => updateOpponentStat(gIdx, sIdx, u)}
                    onReorder={(oldIdx, newIdx) => reorderStats(gIdx, "opponent", oldIdx, newIdx)}
                  />
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      <Button type="button" variant="outline" onClick={addGame} className="w-full" disabled={!opponentId}>
        <Plus className="h-4 w-4 mr-2" /> ゲームを追加
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? <><Spinner className="h-4 w-4 mr-2" />保存中...</> : "登録"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}
