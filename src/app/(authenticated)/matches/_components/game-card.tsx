"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Trash2, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { NumericInput } from "@/components/ui/numeric-input";
import { StatsTable } from "@/components/stats-table";
import type { GameMode, Opponent, Player, MapEntry } from "@/lib/types";
import type { GameInput, StatInput } from "./series-form-shared";
import { calcResult, resultLabel, resultColor, modeLabel } from "./series-form-shared";

interface GameCardProps {
  game: GameInput;
  gIdx: number;
  maps: MapEntry[];
  players: Player[];
  selectedOpponent: Opponent | undefined;
  onToggleExpand: (gIdx: number) => void;
  onRemove: (gIdx: number) => void;
  onUpdateGame: (gIdx: number, updates: Partial<GameInput>) => void;
  onUpdateStat: (gIdx: number, sIdx: number, updates: Partial<StatInput>) => void;
  onUpdateOpponentStat: (gIdx: number, sIdx: number, updates: Partial<StatInput>) => void;
  onUpdateHillTime: (
    gIdx: number,
    side: "team" | "opponent",
    rIdx: number,
    hIdx: number,
    value: string,
  ) => void;
  onUpdateHillWinner: (
    gIdx: number,
    rIdx: number,
    hIdx: number,
    value: "team" | "opponent" | null,
  ) => void;
  onReorderStats: (
    gIdx: number,
    side: "team" | "opponent",
    oldIdx: number,
    newIdx: number,
  ) => void;
}

export function GameCard({
  game,
  gIdx,
  maps,
  players,
  selectedOpponent,
  onToggleExpand,
  onRemove,
  onUpdateGame,
  onUpdateStat,
  onUpdateOpponentStat,
  onUpdateHillTime,
  onUpdateHillWinner,
  onReorderStats,
}: GameCardProps) {
  const modeMaps = maps.filter((m) => m.mode === game.mode);
  const selectedMap = maps.find((m) => m.id === game.map_id);
  const hillCount = game.mode === "hardpoint" ? (selectedMap?.hill_count ?? 0) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => onToggleExpand(gIdx)}
              className="cursor-pointer"
            >
              {game.expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            Game {gIdx + 1}
            <span className="text-xs sm:text-sm font-normal text-muted-foreground">
              {modeLabel[game.mode]} - {game.score_team} :{" "}
              {game.score_opponent}
            </span>
            <span
              className={`text-xs sm:text-sm font-medium ${resultColor[calcResult(game.score_team, game.score_opponent)]}`}
            >
              {resultLabel[calcResult(game.score_team, game.score_opponent)]}
            </span>
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(gIdx)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      {game.expanded && (
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-2">
              <Label>モード</Label>
              <Select
                value={game.mode}
                onChange={(e) =>
                  onUpdateGame(gIdx, {
                    mode: e.target.value as GameMode,
                    map_id: "",
                    hill_times: { team: [[]], opponent: [[]], winner: [[]] },
                  })
                }
              >
                <option value="hardpoint">Hardpoint</option>
                <option value="snd">S&D</option>
                <option value="overload">Overload</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>マップ</Label>
              <Select
                value={game.map_id}
                onChange={(e) =>
                  onUpdateGame(gIdx, {
                    map_id: e.target.value,
                    hill_times: { team: [[]], opponent: [[]], winner: [[]] },
                  })
                }
              >
                <option value="">未選択</option>
                {modeMaps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>自チーム</Label>
              <NumericInput
                value={game.score_team}
                onChange={(v) => onUpdateGame(gIdx, { score_team: v })}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>相手チーム</Label>
              <NumericInput
                value={game.score_opponent}
                onChange={(v) => onUpdateGame(gIdx, { score_opponent: v })}
                className="w-full"
              />
            </div>
          </div>

          {game.mode === "hardpoint" && hillCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  地点別 Hill Time（秒）
                </Label>
                <div className="flex gap-2">
                  {game.hill_times.team.length < 4 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onUpdateGame(gIdx, {
                          hill_times: {
                            team: [...game.hill_times.team, []],
                            opponent: [...game.hill_times.opponent, []],
                            winner: [...game.hill_times.winner, []],
                          },
                        })
                      }
                    >
                      <Plus className="h-3 w-3 mr-1" /> 周追加
                    </Button>
                  )}
                  {game.hill_times.team.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onUpdateGame(gIdx, {
                          hill_times: {
                            team: game.hill_times.team.slice(0, -1),
                            opponent: game.hill_times.opponent.slice(0, -1),
                            winner: game.hill_times.winner.slice(0, -1),
                          },
                        })
                      }
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> 削除
                    </Button>
                  )}
                </div>
              </div>
              {(() => {
                const t = game.hill_times.team
                  .flat()
                  .reduce((s, v) => s + (parseInt(v) || 0), 0);
                const o = game.hill_times.opponent
                  .flat()
                  .reduce((s, v) => s + (parseInt(v) || 0), 0);
                if (t === 0 && o === 0) return null;
                return (
                  <div className="text-sm text-muted-foreground">
                    合計: 自{" "}
                    <span className="font-semibold stat-number text-foreground">
                      {t}s
                    </span>{" "}
                    / 相手{" "}
                    <span className="font-semibold stat-number text-foreground">
                      {o}s
                    </span>
                  </div>
                );
              })()}
              <div className="overflow-x-auto">
                <table className="text-sm border-separate border-spacing-x-3 border-spacing-y-1">
                  <thead>
                    <tr>
                      <th className="text-xs text-muted-foreground font-medium text-left min-w-[90px]"></th>
                      {Array.from({ length: hillCount }, (_, h) => (
                        <th
                          key={h}
                          className="text-xs text-muted-foreground font-medium text-center"
                        >
                          Hill {h + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {game.hill_times.team.map((_, rIdx) => (
                      <React.Fragment key={rIdx}>
                        <tr>
                          <td className="text-xs text-muted-foreground pr-2 whitespace-nowrap">
                            自 {rIdx + 1}周目
                          </td>
                          {Array.from({ length: hillCount }, (_, h) => (
                            <td key={h}>
                              <NumericInput
                                className="w-16"
                                value={game.hill_times.team[rIdx]?.[h] ?? ""}
                                onChange={(v) =>
                                  onUpdateHillTime(gIdx, "team", rIdx, h, v)
                                }
                              />
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="text-xs text-muted-foreground pr-2 whitespace-nowrap">
                            相手 {rIdx + 1}周目
                          </td>
                          {Array.from({ length: hillCount }, (_, h) => (
                            <td key={h}>
                              <NumericInput
                                className="w-16"
                                value={
                                  game.hill_times.opponent[rIdx]?.[h] ?? ""
                                }
                                onChange={(v) =>
                                  onUpdateHillTime(
                                    gIdx,
                                    "opponent",
                                    rIdx,
                                    h,
                                    v,
                                  )
                                }
                              />
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="text-xs text-muted-foreground pr-2 whitespace-nowrap py-0.5">
                            ローテ
                          </td>
                          {Array.from({ length: hillCount }, (_, h) => {
                            const w =
                              game.hill_times.winner[rIdx]?.[h] ?? null;
                            return (
                              <td key={h} className="text-center py-0.5">
                                <input
                                  type="checkbox"
                                  checked={w === "team"}
                                  onChange={(e) =>
                                    onUpdateHillWinner(
                                      gIdx,
                                      rIdx,
                                      h,
                                      e.target.checked ? "team" : "opponent",
                                    )
                                  }
                                  className="h-4 w-4"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <StatsTable
            label="自チームスタッツ"
            mode={game.mode}
            stats={game.stats}
            playerOptions={players}
            onUpdate={(sIdx, u) => onUpdateStat(gIdx, sIdx, u)}
            onReorder={(oldIdx, newIdx) =>
              onReorderStats(gIdx, "team", oldIdx, newIdx)
            }
          />
          <div className="border-t pt-4">
            <StatsTable
              label={`相手チームスタッツ（${selectedOpponent?.name ?? ""}）`}
              mode={game.mode}
              stats={game.opponent_stats}
              playerOptions={selectedOpponent?.opponent_players ?? []}
              onUpdate={(sIdx, u) => onUpdateOpponentStat(gIdx, sIdx, u)}
              onReorder={(oldIdx, newIdx) =>
                onReorderStats(gIdx, "opponent", oldIdx, newIdx)
              }
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
