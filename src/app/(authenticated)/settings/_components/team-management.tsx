"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pencil, Check, X, LogOut } from "lucide-react";
import type { Player, Team } from "@/lib/types";

interface TeamManagementProps {
  team: Team;
  players: Player[];
  currentProfileId: string;
}

export function TeamManagement({ team, players, currentProfileId }: TeamManagementProps) {
  const router = useRouter();
  const [teamName, setTeamName] = useState(team.name);
  const [editingTeamName, setEditingTeamName] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingPlayerName, setEditingPlayerName] = useState("");
  const [error, setError] = useState("");

  const handleSaveTeamName = async () => {
    const name = teamName.trim();
    if (!name) return;
    setSavingTeam(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.from("teams").update({ name }).eq("id", team.id);
    if (error) setError("チーム名の変更に失敗しました");
    else setEditingTeamName(false);
    setSavingTeam(false);
    router.refresh();
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditingPlayerName(player.name);
  };

  const handleSavePlayerName = async (playerId: string) => {
    const name = editingPlayerName.trim();
    if (!name) return;
    setError("");
    const supabase = createClient();
    const { error } = await supabase.from("players").update({ name }).eq("id", playerId);
    if (error) setError("名前の変更に失敗しました");
    else setEditingPlayerId(null);
    router.refresh();
  };

  const handleLeaveTeam = async () => {
    if (!confirm("チームから脱退しますか？この操作は取り消せません。")) return;
    const supabase = createClient();
    await supabase.from("profiles").delete().eq("id", currentProfileId);
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* チーム名 */}
      <div className="space-y-1.5">
        <Label className="text-sm text-muted-foreground">チーム名</Label>
        {editingTeamName ? (
          <div className="flex gap-2">
            <Input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="h-8 max-w-xs"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSaveTeamName()}
            />
            <Button size="sm" onClick={handleSaveTeamName} disabled={savingTeam || !teamName.trim()}>
              {savingTeam ? "保存中..." : "保存"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setTeamName(team.name); setEditingTeamName(false); }}>
              キャンセル
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{team.name}</span>
            <button onClick={() => setEditingTeamName(true)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="チーム名を編集">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* プレイヤー一覧 */}
      <div className="space-y-1.5">
        <Label className="text-sm text-muted-foreground">メンバー（{players.length}人）</Label>
        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground">プレイヤーが登録されていません</p>
        ) : (
          <div className="rounded-md border border-border divide-y divide-border">
            {players.map((player) => (
              <div key={player.id} className="flex items-center justify-between px-3 py-2">
                {editingPlayerId === player.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editingPlayerName}
                      onChange={(e) => setEditingPlayerName(e.target.value)}
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSavePlayerName(player.id);
                        if (e.key === "Escape") setEditingPlayerId(null);
                      }}
                    />
                    <button onClick={() => handleSavePlayerName(player.id)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="保存">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setEditingPlayerId(null)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="キャンセル">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm">{player.name}</span>
                    <button onClick={() => handleEditPlayer(player)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label={`${player.name}を編集`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 脱退 */}
      <div className="pt-1">
        <Button
          variant="outline"
          size="sm"
          className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          onClick={handleLeaveTeam}
        >
          <LogOut className="h-4 w-4 mr-2" />
          チームから脱退
        </Button>
      </div>
    </div>
  );
}
