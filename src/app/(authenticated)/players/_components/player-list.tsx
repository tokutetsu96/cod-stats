"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Star } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { Player } from "@/lib/types";

export function PlayerList({ players, teamId, isAdmin }: { players: Player[]; teamId: string; isAdmin: boolean }) {
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const router = useRouter();

  const defaultPlayers = players.filter((p) => p.is_default);
  const otherPlayers = players.filter((p) => !p.is_default);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("players").insert({ name: name.trim(), team_id: teamId });
    setName("");
    setLoading(false);
    router.refresh();
  };

  const handleToggleDefault = async (id: string, current: boolean) => {
    if (!current && defaultPlayers.length >= 4) return;
    setTogglingId(id);
    const supabase = createClient();
    await supabase.from("players").update({ is_default: !current }).eq("id", id);
    router.refresh();
    setTogglingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このプレイヤーを削除しますか？関連する戦績データも確認してください。")) return;
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("players").delete().eq("id", id);
    router.refresh();
    setDeletingId(null);
  };

  const handleEdit = async (id: string) => {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("players").update({ name: editName.trim() }).eq("id", id);
    setEditId(null);
    setLoading(false);
    router.refresh();
  };

  const renderRow = (p: Player) => (
    <tr key={p.id} className="border-b last:border-0">
      {editId === p.id ? (
        <>
          <td className="py-2">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
          </td>
          <td className="py-2" />
          <td className="py-2 space-x-1">
            <Button size="sm" variant="outline" onClick={() => handleEdit(p.id)} disabled={loading}>保存</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>取消</Button>
          </td>
        </>
      ) : (
        <>
          <td className="py-2 font-medium">
            <Link href={`/players/${p.id}`} className="text-primary hover:underline">{p.name}</Link>
          </td>
          <td className="py-2 text-center">
            {isAdmin ? (
              <button
                onClick={() => handleToggleDefault(p.id, p.is_default)}
                aria-label={p.is_default ? "デフォルトから外す" : "デフォルトに設定"}
                disabled={!p.is_default && defaultPlayers.length >= 4}
                className="disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Star className={`h-4 w-4 ${p.is_default ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
              </button>
            ) : (
              <Star className={`h-4 w-4 ${p.is_default ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
            )}
          </td>
          {isAdmin && (
            <td className="py-2 space-x-1">
              <Button size="icon" variant="ghost" onClick={() => { setEditId(p.id); setEditName(p.name); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}>
                {deletingId === p.id ? <Spinner /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </td>
          )}
        </>
      )}
    </tr>
  );

  return (
    <div className="space-y-4">
      {isAdmin && (
        <form onSubmit={handleAdd} className="flex gap-2 items-end">
          <div className="flex-1">
            <Input placeholder="プレイヤー名" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />} 追加
          </Button>
        </form>
      )}

      {players.length === 0 ? (
        <p className="text-sm text-muted-foreground">プレイヤーが登録されていません</p>
      ) : (
        <div className="space-y-4">
          {/* デフォルトセクション */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">デフォルト</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${defaultPlayers.length >= 4 ? "bg-yellow-400/20 text-yellow-600" : "bg-muted text-muted-foreground"}`}>
                {defaultPlayers.length} / 4
              </span>
            </div>
            {defaultPlayers.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-1">未設定</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">名前</th>
                    <th className="pb-2 font-medium w-16 text-center">デフォルト</th>
                    {isAdmin && <th className="pb-2 font-medium w-24">操作</th>}
                  </tr>
                </thead>
                <tbody>{defaultPlayers.map(renderRow)}</tbody>
              </table>
            )}
          </div>

          {/* その他セクション */}
          {otherPlayers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-muted-foreground">その他</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">名前</th>
                    <th className="pb-2 font-medium w-16 text-center">デフォルト</th>
                    {isAdmin && <th className="pb-2 font-medium w-24">操作</th>}
                  </tr>
                </thead>
                <tbody>{otherPlayers.map(renderRow)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
