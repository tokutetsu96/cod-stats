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

interface OpponentWithStats {
  id: string;
  name: string;
  memo: string | null;
  wins: number;
  total: number;
  winRate: string;
  opponent_players: OpponentPlayer[];
}

export function OpponentList({ opponents, teamId }: { opponents: OpponentWithStats[]; teamId: string }) {
  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [addingPlayerId, setAddingPlayerId] = useState<string | null>(null);
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);
  const [togglingPlayerId, setTogglingPlayerId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const router = useRouter();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("opponents").insert({ name: name.trim(), memo: memo.trim() || null, team_id: teamId });
    setName("");
    setMemo("");
    setLoading(false);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("opponents").delete().eq("id", id);
    router.refresh();
    setDeletingId(null);
  };

  const handleEdit = async (id: string) => {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("opponents").update({ name: editName.trim(), memo: editMemo.trim() || null }).eq("id", id);
    setEditId(null);
    setLoading(false);
    router.refresh();
  };

  const handleAddPlayer = async (e: React.FormEvent, opponentId: string) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    setAddingPlayerId(opponentId);
    const supabase = createClient();
    await supabase.from("opponent_players").insert({ name: newPlayerName.trim(), opponent_id: opponentId, team_id: teamId });
    setNewPlayerName("");
    setAddingPlayerId(null);
    router.refresh();
  };

  const handleDeletePlayer = async (playerId: string) => {
    setDeletingPlayerId(playerId);
    const supabase = createClient();
    await supabase.from("opponent_players").delete().eq("id", playerId);
    router.refresh();
    setDeletingPlayerId(null);
  };

  const handleTogglePlayerDefault = async (playerId: string, current: boolean, players: OpponentPlayer[]) => {
    if (!current && players.filter((p) => p.is_default).length >= 4) return;
    setTogglingPlayerId(playerId);
    const supabase = createClient();
    await supabase.from("opponent_players").update({ is_default: !current }).eq("id", playerId);
    router.refresh();
    setTogglingPlayerId(null);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Input placeholder="チーム名" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex-1 space-y-1">
          <Input placeholder="メモ（任意）" value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? <Spinner className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />} 追加
        </Button>
      </form>

      {opponents.length === 0 ? (
        <p className="text-sm text-muted-foreground">対戦相手が登録されていません</p>
      ) : (
        <div className="space-y-1">
          {opponents.map((opp) => (
            <div key={opp.id} className="border rounded-md">
              {/* メイン行 */}
              <div className="flex items-center gap-2 px-3 py-2">
                {editId === opp.id ? (
                  <>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 flex-1" />
                    <Input value={editMemo} onChange={(e) => setEditMemo(e.target.value)} className="h-8 flex-1" placeholder="メモ" />
                    <Button size="sm" variant="outline" onClick={() => handleEdit(opp.id)} disabled={loading}>保存</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>取消</Button>
                  </>
                ) : (
                  <>
                    <Link href={`/opponents/${opp.id}`} className="font-medium text-sm flex-1 hover:underline">{opp.name}</Link>
                    <span className="text-sm text-muted-foreground flex-1">{opp.memo ?? ""}</span>
                    <span className="text-sm text-muted-foreground w-28 text-right">
                      {opp.wins}勝 / {opp.total}試合
                      {opp.total > 0 && <span className="ml-1">({opp.winRate}%)</span>}
                    </span>
                    <button
                      onClick={() => setExpandedId(expandedId === opp.id ? null : opp.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-2"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>{opp.opponent_players.length}</span>
                      {expandedId === opp.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditId(opp.id); setEditName(opp.name); setEditMemo(opp.memo ?? ""); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(opp.id)} disabled={deletingId === opp.id}>
                      {deletingId === opp.id ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
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
                      <button
                        onClick={() => handleTogglePlayerDefault(p.id, p.is_default, opp.opponent_players)}
                        aria-label={p.is_default ? "デフォルトから外す" : "デフォルトに設定"}
                        disabled={!p.is_default && defaultP.length >= 4}
                        className="disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Star className={`h-4 w-4 ${p.is_default ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                      </button>
                    </td>
                    <td className="py-1.5">
                      <button onClick={() => handleDeletePlayer(p.id)} className="text-muted-foreground hover:text-destructive" disabled={deletingPlayerId === p.id}>
                        {deletingPlayerId === p.id ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>
                );
                return (
                  <div className="border-t px-4 py-3 bg-muted/30 space-y-4">
                    <form onSubmit={(e) => handleAddPlayer(e, opp.id)} className="flex gap-2">
                      <Input placeholder="選手名" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} className="h-8 max-w-48" />
                      <Button type="submit" size="sm" variant="outline" disabled={addingPlayerId === opp.id}>
                        {addingPlayerId === opp.id ? <Spinner className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}追加
                      </Button>
                    </form>

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
                              <thead><tr className="border-b text-left"><th className="pb-1.5 font-medium">名前</th><th className="pb-1.5 w-16 text-center font-medium">デフォルト</th><th className="pb-1.5 w-8"></th></tr></thead>
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
                              <thead><tr className="border-b text-left"><th className="pb-1.5 font-medium">名前</th><th className="pb-1.5 w-16 text-center font-medium">デフォルト</th><th className="pb-1.5 w-8"></th></tr></thead>
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
