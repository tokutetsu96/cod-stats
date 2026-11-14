"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSeries } from "@/app/(authenticated)/matches/actions";
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
import type { GameMode, SeriesType, Opponent, Player, MapEntry } from "@/lib/types";
import { GameCard } from "./game-card";
import {
  buildSeriesPayload,
  YOUTUBE_URL_ERROR,
  type SeriesFormValues,
} from "./series-form-shared";
import { useGamesState } from "./use-games-state";

interface SeriesFormProps {
  opponents: Opponent[];
  players: Player[];
  maps: MapEntry[];
  modes: GameMode[];
  /** 編集時の初期値。省略時は新規作成フォームになる */
  initial?: SeriesFormValues;
}

/** 対戦（シリーズ+ゲーム+スタッツ）の作成・編集フォーム */
export function SeriesForm({ opponents, players, maps, modes, initial }: SeriesFormProps) {
  const router = useRouter();
  const seriesId = initial?.seriesId;
  const isEdit = seriesId !== undefined;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [seriesType, setSeriesType] = useState<SeriesType>(initial?.seriesType ?? "scrim");
  const [seriesDate, setSeriesDate] = useState(() => initial?.seriesDate ?? todayStr());
  const [opponentId, setOpponentId] = useState(initial?.opponentId ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtubeUrl ?? "");
  const {
    games,
    addGame,
    removeGame,
    updateGame,
    toggleExpand,
    updateStat,
    updateOpponentStat,
    updateHillTime,
    updateHillWinner,
    reorderStats,
  } = useGamesState(initial?.games ?? []);

  const selectedOpponent = opponents.find((o) => o.id === opponentId);
  const detailPath = isEdit ? `/matches/${seriesId}` : "/matches";

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
      setError(YOUTUBE_URL_ERROR);
      return;
    }
    setError("");
    setLoading(true);

    // 作成・更新はServer Action経由でRPCが1トランザクションで原子的に処理するため、
    // 途中失敗で中途半端なデータが残ることはない
    try {
      const result = await saveSeries(
        buildSeriesPayload({ seriesDate, seriesType, opponentId, memo, youtubeUrl, games }),
        seriesId,
      );
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
    } catch {
      setError(`${isEdit ? "更新" : "登録"}に失敗しました。時間をおいて再度お試しください`);
      setLoading(false);
      return;
    }

    router.push(detailPath);
    router.refresh();
  };

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
          modes={modes}
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
        onClick={() => addGame(players, selectedOpponent?.opponent_players ?? [])}
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
          ) : isEdit ? (
            "更新"
          ) : (
            "登録"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => (isEdit ? router.push(detailPath) : router.back())}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
