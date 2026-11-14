"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Users, ChevronDown, ChevronUp, Star } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { GameMode, OpponentPlayer } from "@/lib/types";
import { modeShortLabel as modeLabel } from "@/lib/constants";
import { useAction } from "@/lib/use-action";
import {
  addOpponent,
  addOpponentPlayer,
  deleteOpponent,
  deleteOpponentPlayer,
  renameOpponent,
  setOpponentPlayerDefault,
} from "../actions";

const MAX_DEFAULT_PLAYERS = 4;

interface ModeStat {
  mode: GameMode;
  wins: number;
  total: number;
}

interface OpponentWithStats {
  id: string;
  name: string;
  wins: number;
  total: number;
  winRate: string;
  modeStats: ModeStat[];
  opponent_players: OpponentPlayer[];
}


export function OpponentList({ opponents, isAdmin }: { opponents: OpponentWithStats[]; isAdmin: boolean }) {
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  // 更新は Server Action 経由（権限チェック・team_id スコープ・再取得はサーバー側で行う）
  const { pendingKey, error: mutationError, run } = useAction();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    run("add", () => addOpponent(name), () => setName(""));
  };

  const handleDelete = (id: string) => {
    if (!confirm("削除しますか？")) return;
    run(`delete:${id}`, () => deleteOpponent(id));
  };

  const handleEdit = (id: string) =>
    run(`edit:${id}`, () => renameOpponent(id, editName), () => setEditId(null));

  const handleAddPlayer = (e: React.FormEvent, opponentId: string) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    run(`add-player:${opponentId}`, () => addOpponentPlayer(opponentId, newPlayerName), () => setNewPlayerName(""));
  };

  const handleDeletePlayer = (playerId: string) =>
    run(`delete-player:${playerId}`, () => deleteOpponentPlayer(playerId));

  const handleTogglePlayerDefault = (playerId: string, current: boolean, players: OpponentPlayer[]) => {
    if (!current && players.filter((p) => p.is_default).length >= MAX_DEFAULT_PLAYERS) return;
    run(`toggle-player:${playerId}`, () => setOpponentPlayerDefault(playerId, !current));
  };

  return (
    <div className="space-y-4">
      {mutationError && <p className="text-sm text-destructive">{mutationError}</p>}
      {isAdmin && (
        <form onSubmit={handleAdd} className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Input placeholder="チーム名" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <Button type="submit" size="sm" disabled={pendingKey === "add"}>
            {pendingKey === "add" ? <Spinner className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />} 追加
          </Button>
        </form>
      )}

      {opponents.length === 0 ? (
        <p className="text-sm text-muted-foreground">対戦相手が登録されていません</p>
      ) : (
        <div className="space-y-1">
          {opponents.map((opp) => (
            <div key={opp.id} className="border rounded-md">
              {/* メイン行 */}
              <div className="px-3 py-2">
                {editId === opp.id ? (
                  <div className="flex items-center gap-2">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 flex-1" />
                    <Button size="sm" variant="outline" onClick={() => handleEdit(opp.id)} disabled={pendingKey === `edit:${opp.id}`}>保存</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>取消</Button>
                  </div>
                ) : (
                  <>
                    {/* 1行目: 名前 + 操作ボタン */}
                    <div className="flex items-center gap-2">
                      <Link href={`/opponents/${opp.id}`} className="font-medium text-sm min-w-0 flex-1 hover:underline truncate">{opp.name}</Link>
                      <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                        <span className="font-medium text-foreground">
                          {opp.wins}/{opp.total}
                          {opp.total > 0 && <span className="ml-1">({opp.winRate}%)</span>}
                        </span>
                        {opp.modeStats.map((ms) => (
                          <span key={ms.mode}>
                            {modeLabel[ms.mode]} {ms.total > 0 ? `${ms.wins}/${ms.total}` : "-/-"}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => setExpandedId(expandedId === opp.id ? null : opp.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-2"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>{opp.opponent_players.length}</span>
                        {expandedId === opp.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      {isAdmin && (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditId(opp.id); setEditName(opp.name); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(opp.id)} disabled={pendingKey === `delete:${opp.id}`}>
                            {pendingKey === `delete:${opp.id}` ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </>
                      )}
                    </div>
                    {/* 2行目 (モバイルのみ): 戦績 + モード別 */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 sm:hidden">
                      <span className="font-medium text-foreground">
                        {opp.wins}/{opp.total}
                        {opp.total > 0 && <span className="ml-1">({opp.winRate}%)</span>}
                      </span>
                      {opp.modeStats.map((ms) => (
                        <span key={ms.mode}>
                          {modeLabel[ms.mode]} {ms.total > 0 ? `${ms.wins}/${ms.total}` : "-/-"}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 選手一覧（展開時） */}
              {expandedId === opp.id && (() => {
                const sorted = [...opp.opponent_players].sort((a, b) => a.created_at.localeCompare(b.created_at));
                const defaultP = sorted.filter((p) => p.is_default);
                const otherP = sorted.filter((p) => !p.is_default);
                const renderPlayerRow = (p: OpponentPlayer) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-1.5 font-medium">{p.name}</td>
                    <td className="py-1.5 text-center">
                      {isAdmin ? (
                        <button
                          onClick={() => handleTogglePlayerDefault(p.id, p.is_default, opp.opponent_players)}
                          aria-label={p.is_default ? "デフォルトから外す" : "デフォルトに設定"}
                          disabled={pendingKey === `toggle-player:${p.id}` || (!p.is_default && defaultP.length >= MAX_DEFAULT_PLAYERS)}
                          className="disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Star className={`h-4 w-4 ${p.is_default ? "fill-star text-star" : "text-muted-foreground"}`} />
                        </button>
                      ) : (
                        <Star className={`h-4 w-4 ${p.is_default ? "fill-star text-star" : "text-muted-foreground"}`} />
                      )}
                    </td>
                    {isAdmin && (
                      <td className="py-1.5">
                        <button onClick={() => handleDeletePlayer(p.id)} className="text-muted-foreground hover:text-destructive" disabled={pendingKey === `delete-player:${p.id}`}>
                          {pendingKey === `delete-player:${p.id}` ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    )}
                  </tr>
                );
                return (
                  <div className="border-t px-4 py-3 bg-muted/30 space-y-4">
                    {isAdmin && (
                      <form onSubmit={(e) => handleAddPlayer(e, opp.id)} className="flex gap-2">
                        <Input placeholder="選手名" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} className="h-8 max-w-48" />
                        <Button type="submit" size="sm" variant="outline" disabled={pendingKey === `add-player:${opp.id}`}>
                          {pendingKey === `add-player:${opp.id}` ? <Spinner className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}追加
                        </Button>
                      </form>
                    )}

                    {opp.opponent_players.length === 0 ? (
                      <p className="text-xs text-muted-foreground">選手が登録されていません</p>
                    ) : (
                      <>
                        {/* デフォルトセクション */}
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <Star className="h-3.5 w-3.5 fill-star text-star" />
                            <span className="text-xs font-medium">デフォルト</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${defaultP.length >= MAX_DEFAULT_PLAYERS ? "bg-star/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                              {defaultP.length} / {MAX_DEFAULT_PLAYERS}
                            </span>
                          </div>
                          {defaultP.length === 0 ? (
                            <p className="text-xs text-muted-foreground pl-1">未設定</p>
                          ) : (
                            <table className="w-full text-sm">
                              <thead><tr className="border-b text-left"><th className="pb-1.5 font-medium">名前</th><th className="pb-1.5 w-12 sm:w-16 text-center font-medium">デフォルト</th>{isAdmin && <th className="pb-1.5 w-8"></th>}</tr></thead>
                              <tbody>{defaultP.map(renderPlayerRow)}</tbody>
                            </table>
                          )}
                        </div>

                        {/* その他セクション */}
                        {otherP.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-medium text-muted-foreground">その他</span>
                            </div>
                            <table className="w-full text-sm">
                              <thead><tr className="border-b text-left"><th className="pb-1.5 font-medium">名前</th><th className="pb-1.5 w-12 sm:w-16 text-center font-medium">デフォルト</th>{isAdmin && <th className="pb-1.5 w-8"></th>}</tr></thead>
                              <tbody>{otherP.map(renderPlayerRow)}</tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
