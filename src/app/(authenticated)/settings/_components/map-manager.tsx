"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { GameMode, MapEntry } from "@/lib/types";
import { modeLabel } from "@/lib/constants";
import { useAction } from "@/lib/use-action";
import { addMap, deleteMap, updateMap } from "../actions";

export function MapManager({ maps, modes, titleId, isAdmin }: { maps: MapEntry[]; modes: GameMode[]; titleId: string; isAdmin: boolean }) {
  const [activeMode, setActiveMode] = useState<GameMode>("hardpoint");
  const [name, setName] = useState("");
  const [hillCount, setHillCount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editHillCount, setEditHillCount] = useState("");
  // 更新は Server Action 経由（権限チェック・team_id スコープ・再取得はサーバー側で行う）
  const { pendingKey, error: mutationError, run } = useAction();

  const startEdit = (m: MapEntry) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditHillCount(m.hill_count ? String(m.hill_count) : "");
  };

  const cancelEdit = () => setEditingId(null);

  const handleSave = (m: MapEntry) => {
    if (!editName.trim()) return;
    run(`save:${m.id}`, () => updateMap(m.id, m.mode, editName, editHillCount), () => setEditingId(null));
  };

  const filtered = maps.filter((m) => m.mode === activeMode);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    run("add", () => addMap(titleId, activeMode, name, hillCount), () => {
      setName("");
      setHillCount("");
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("このマップを削除しますか？")) return;
    run(`delete:${id}`, () => deleteMap(id));
  };

  return (
    <div className="space-y-4">
      {mutationError && <p className="text-sm text-destructive">{mutationError}</p>}
      <div className="flex gap-2">
        {modes.map((mode) => (
          <Button
            key={mode}
            variant={activeMode === mode ? "default" : "outline"}
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => setActiveMode(mode)}
          >
            {modeLabel[mode]}
          </Button>
        ))}
      </div>

      {isAdmin && (
        <form onSubmit={handleAdd} className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              placeholder={`${modeLabel[activeMode]} のマップ名`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          {activeMode === "hardpoint" && (
            <div className="w-20">
              <Input
                type="number"
                min="1"
                max="20"
                placeholder="地点数"
                value={hillCount}
                onChange={(e) => setHillCount(e.target.value)}
              />
            </div>
          )}
          <Button type="submit" size="sm" disabled={pendingKey === "add"}>
            {pendingKey === "add" ? <Spinner className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />} 追加
          </Button>
        </form>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">マップが登録されていません</p>
      ) : (
        <div className="space-y-1">
          {filtered.map((m) => (
            <div key={m.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
              {editingId === m.id ? (
                <>
                  <Input
                    className="h-7 text-sm flex-1"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                  {m.mode === "hardpoint" && (
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      placeholder="地点数"
                      className="h-7 text-sm w-20"
                      value={editHillCount}
                      onChange={(e) => setEditHillCount(e.target.value)}
                    />
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSave(m)} disabled={pendingKey === `save:${m.id}`}>
                    {pendingKey === `save:${m.id}` ? <Spinner /> : <Check className="h-4 w-4 text-win" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm flex-1">
                    {m.name}
                    {m.mode === "hardpoint" && m.hill_count && (
                      <span className="ml-2 text-xs text-muted-foreground">{m.hill_count}地点</span>
                    )}
                  </span>
                  {isAdmin && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(m)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(m.id)} disabled={pendingKey === `delete:${m.id}`}>
                        {pendingKey === `delete:${m.id}` ? <Spinner /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
