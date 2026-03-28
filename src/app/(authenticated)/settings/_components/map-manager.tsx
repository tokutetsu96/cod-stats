"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { GameMode, MapEntry } from "@/lib/types";

const modeLabel: Record<GameMode, string> = {
  hardpoint: "Hardpoint",
  snd: "S&D",
  overload: "Overload",
};

const modes: GameMode[] = ["hardpoint", "snd", "overload"];

export function MapManager({ maps, teamId }: { maps: MapEntry[]; teamId: string }) {
  const [activeMode, setActiveMode] = useState<GameMode>("hardpoint");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const filtered = maps.filter((m) => m.mode === activeMode);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("maps").insert({ name: name.trim(), mode: activeMode, team_id: teamId });
    setName("");
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
            onClick={() => setActiveMode(mode)}
          >
            {modeLabel[mode]}
          </Button>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 items-end">
        <div className="flex-1">
          <Input
            placeholder={`${modeLabel[activeMode]} のマップ名`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? <Spinner className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />} 追加
        </Button>
      </form>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">マップが登録されていません</p>
      ) : (
        <div className="space-y-1">
          {filtered.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
              <span className="text-sm">{m.name}</span>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(m.id)} disabled={deletingId === m.id}>
                {deletingId === m.id ? <Spinner /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
