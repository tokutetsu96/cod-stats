"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Star, Eye, EyeOff } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { Player } from "@/lib/types";
import { useAction } from "@/lib/use-action";
import { addPlayer, deletePlayer, updatePlayer } from "../actions";

const MAX_DEFAULT_PLAYERS = 4;

export function PlayerList({ players, isAdmin }: { players: Player[]; isAdmin: boolean }) {
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  // 更新は Server Action 経由（権限チェック・team_id スコープ・再取得はサーバー側で行う）
  const { pendingKey, error: mutationError, run } = useAction();

  const defaultPlayers = players.filter((p) => p.is_default);
  const otherPlayers = players.filter((p) => !p.is_default);
  const defaultsFull = defaultPlayers.length >= MAX_DEFAULT_PLAYERS;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    run("add", () => addPlayer(name), () => setName(""));
  };

  const handleToggleDefault = (id: string, current: boolean) => {
    if (!current && defaultsFull) return;
    run(`default:${id}`, () => updatePlayer(id, { is_default: !current }));
  };

  const handleToggleActive = (id: string, current: boolean) =>
    run(`active:${id}`, () => updatePlayer(id, { is_active: !current }));

  const handleDelete = (id: string) => {
    if (!confirm("このプレイヤーを削除しますか？関連する戦績データも確認してください。")) return;
    run(`delete:${id}`, () => deletePlayer(id));
  };

  const handleEdit = (id: string) =>
    run(`edit:${id}`, () => updatePlayer(id, { name: editName }), () => setEditId(null));

  const renderRow = (p: Player) => (
    <tr key={p.id} className="border-b last:border-0">
      {editId === p.id ? (
        <>
          <td className="py-2">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
          </td>
          <td className="py-2" />
          <td className="py-2" />
          <td className="py-2 space-x-1">
            <Button size="sm" variant="outline" onClick={() => handleEdit(p.id)} disabled={pendingKey === `edit:${p.id}`}>保存</Button>
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
                disabled={pendingKey === `default:${p.id}` || (!p.is_default && defaultsFull)}
                className="disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Star className={`h-4 w-4 ${p.is_default ? "fill-star text-star" : "text-muted-foreground"}`} />
              </button>
            ) : (
              <Star className={`h-4 w-4 ${p.is_default ? "fill-star text-star" : "text-muted-foreground"}`} />
            )}
          </td>
          <td className="py-2 text-center">
            {isAdmin ? (
              <button
                onClick={() => handleToggleActive(p.id, p.is_active)}
                aria-label={p.is_active ? "ダッシュボードから非表示にする" : "ダッシュボードに表示する"}
                disabled={pendingKey === `active:${p.id}`}
                className="disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {p.is_active ? (
                  <Eye className="h-4 w-4 text-primary" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ) : p.is_active ? (
              <Eye className="h-4 w-4 text-primary" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </td>
          {isAdmin && (
            <td className="py-2 space-x-1">
              <Button size="icon" variant="ghost" onClick={() => { setEditId(p.id); setEditName(p.name); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)} disabled={pendingKey === `delete:${p.id}`}>
                {pendingKey === `delete:${p.id}` ? <Spinner /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </td>
          )}
        </>
      )}
    </tr>
  );

  return (
    <div className="space-y-4">
      {mutationError && <p className="text-sm text-destructive">{mutationError}</p>}
      {isAdmin && (
        <form onSubmit={handleAdd} className="flex gap-2 items-end">
          <div className="flex-1">
            <Input placeholder="プレイヤー名" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <Button type="submit" size="sm" disabled={pendingKey === "add"}>
            {pendingKey === "add" ? <Spinner className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />} 追加
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
              <Star className="h-4 w-4 fill-star text-star" />
              <span className="text-sm font-medium">デフォルト</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${defaultsFull ? "bg-star/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                {defaultPlayers.length} / {MAX_DEFAULT_PLAYERS}
              </span>
            </div>
            {defaultPlayers.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-1">未設定</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">名前</th>
                    <th className="pb-2 font-medium w-20 sm:w-24 text-center whitespace-nowrap">デフォルト</th>
                    <th className="pb-2 font-medium w-12 sm:w-16 text-center">表示</th>
                    {isAdmin && <th className="pb-2 font-medium w-16 sm:w-24">操作</th>}
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
                    <th className="pb-2 font-medium w-20 sm:w-24 text-center whitespace-nowrap">デフォルト</th>
                    <th className="pb-2 font-medium w-12 sm:w-16 text-center">表示</th>
                    {isAdmin && <th className="pb-2 font-medium w-16 sm:w-24">操作</th>}
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
