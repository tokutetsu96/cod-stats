"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Users, ChevronDown, ChevronUp, Star } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { OpponentPlayer } from "@/lib/types";

interface ModeStat {
  mode: string;
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

const modeLabel: Record<string, string> = { hardpoint: "HP", snd: "S&D", overload: "OL" };

export function OpponentList({ opponents, teamId, isAdmin }: { opponents: OpponentWithStats[]; teamId: string; isAdmin: boolean }) {
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingPlayerId, setAddingPlayerId] = useState<string | null>(null);
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);
  const [togglingPlayerId, setTogglingPlayerId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [mutationError, setMutationError] = useState("");
  const router = useRouter();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !name.trim()) return;
    setLoading(true);
    setMutationError("");
    const supabase = createClient();
    const { error } = await supabase.from("opponents").insert({ name: name.trim(), team_id: teamId });
    if (error) { setMutationError("追加に失敗しました"); setLoading(false); return; }
    setName("");
    setLoading(false);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm("削除しますか？")) return;
    setDeletingId(id);
    setMutationError("");
    const supabase = createClient();
    const { error } = await supabase.from("opponents").delete().eq("id", id);
    if (error) { setMutationError("削除に失敗しました"); setDeletingId(null); return; }
    router.refresh();
    setDeletingId(null);
  };

  const handleEdit = async (id: string) => {
    if (!isAdmin) return;
    setLoading(true);
    setMutationError("");
    const supabase = createClient();
    const { error } = await supabase.from("opponents").update({ name: editName.trim() }).eq("id", id);
    if (error) { setMutationError("更新に失敗しました"); setLoading(false); return; }
    setEditId(null);
    setLoading(false);
    router.refresh();
  };

  const handleAddPlayer = async (e: React.FormEvent, opponentId: string) => {
    e.preventDefault();
    if (!isAdmin || !newPlayerName.trim()) return;
    setAddingPlayerId(opponentId);
    setMutationError("");
    const supabase = createClient();
    const { error } = await supabase.from("opponent_players").insert({ name: newPlayerName.trim(), opponent_id: opponentId, team_id: teamId });
    if (error) { setMutationError("選手の追加に失敗しました"); setAddingPlayerId(null); return; }
    setNewPlayerName("");
    setAddingPlayerId(null);
    router.refresh();
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!isAdmin) return;
    setDeletingPlayerId(playerId);
    setMutationError("");
    const supabase = createClient();
    const { error } = await supabase.from("opponent_players").delete().eq("id", playerId);
    if (error) { setMutationError("削除に失敗しました"); setDeletingPlayerId(null); return; }
    router.refresh();
    setDeletingPlayerId(null);
  };

  const handleTogglePlayerDefault = async (playerId: string, current: boolean, players: OpponentPlayer[]) => {
    if (!isAdmin) return;
    if (!current && players.filter((p) => p.is_default).length >= 4) return;
    setTogglingPlayerId(playerId);
    const supabase = createClient();
    const { error } = await supabase.from("opponent_players").update({ is_default: !current }).eq("id", playerId);
    if (error) setMutationError("更新に失敗しました");
    router.refresh();
    setTogglingPlayerId(null);
  };

  return (
    <div className="space-y-4">
      {mutationError && <p className="text-sm text-destructive">{mutationError}</p>}
      {isAdmin && (
        <form onSubmit={handleAdd} className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Input placeholder="チーム名" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />} 追加
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
                    <Button size="sm" variant="outline" onClick={() => handleEdit(opp.id)} disabled={loading}>保存</Button>
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
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(opp.id)} disabled={deletingId === opp.id}>
                            {deletingId === opp.id ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
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
                          disabled={togglingPlayerId === p.id || (!p.is_default && defaultP.length >= 4)}
                          className="disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Star className={`h-4 w-4 ${p.is_default ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                        </button>
                      ) : (
                        <Star className={`h-4 w-4 ${p.is_default ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                      )}
                    </td>
                    {isAdmin && (
                      <td className="py-1.5">
                        <button onClick={() => handleDeletePlayer(p.id)} className="text-muted-foreground hover:text-destructive" disabled={deletingPlayerId === p.id}>
                          {deletingPlayerId === p.id ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
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
                        <Button type="submit" size="sm" variant="outline" disabled={addingPlayerId === opp.id}>
                          {addingPlayerId === opp.id ? <Spinner className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}追加
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
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">デフォルト</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${defaultP.length >= 4 ? "bg-yellow-400/20 text-yellow-600" : "bg-muted text-muted-foreground"}`}>
                              {defaultP.length} / 4
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
