"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { GameMode, MapEntry } from "@/lib/types";

const modeLabel: Record<GameMode, string> = {
  hardpoint: "Hardpoint",
  snd: "S&D",
  overload: "Overload",
};

const modes: GameMode[] = ["hardpoint", "snd", "overload"];

export function MapManager({ maps, teamId, isAdmin }: { maps: MapEntry[]; teamId: string; isAdmin: boolean }) {
  const [activeMode, setActiveMode] = useState<GameMode>("hardpoint");
  const [name, setName] = useState("");
  const [hillCount, setHillCount] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editHillCount, setEditHillCount] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const router = useRouter();

  const startEdit = (m: MapEntry) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditHillCount(m.hill_count ? String(m.hill_count) : "");
  };

  const cancelEdit = () => setEditingId(null);

  const handleSave = async (m: MapEntry) => {
    if (!editName.trim()) return;
    setSavingId(m.id);
    const supabase = createClient();
    const hill_count = m.mode === "hardpoint" && editHillCount.trim() ? parseInt(editHillCount) || null : null;
    await supabase.from("maps").update({ name: editName.trim(), hill_count }).eq("id", m.id);
    setSavingId(null);
    setEditingId(null);
    router.refresh();
  };

  const filtered = maps.filter((m) => m.mode === activeMode);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const hill_count = activeMode === "hardpoint" && hillCount.trim() ? parseInt(hillCount) || null : null;
    await supabase.from("maps").insert({ name: name.trim(), mode: activeMode, team_id: teamId, hill_count });
    setName("");
    setHillCount("");
    setLoading(false);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このマップを削除しますか？")) return;
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("maps").delete().eq("id", id);
    router.refresh();
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
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
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />} 追加
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
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSave(m)} disabled={savingId === m.id}>
                    {savingId === m.id ? <Spinner /> : <Check className="h-4 w-4 text-green-500" />}
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
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(m.id)} disabled={deletingId === m.id}>
                        {deletingId === m.id ? <Spinner /> : <Trash2 className="h-4 w-4" />}
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
