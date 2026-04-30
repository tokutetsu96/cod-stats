"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pencil, LogOut, Shield, ShieldOff, UserX } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { Profile, Team, UserRole } from "@/lib/types";
import { updateTeamName, toggleUserRole, kickUser } from "../actions";

interface TeamManagementProps {
  team: Team;
  users: Profile[];
  currentProfile: Profile;
}

export function TeamManagement({ team, users, currentProfile }: TeamManagementProps) {
  const router = useRouter();
  const [teamName, setTeamName] = useState(team.name);
  const [editingTeamName, setEditingTeamName] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [leavingTeam, setLeavingTeam] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = currentProfile.role === "admin";

  const handleSaveTeamName = async () => {
    if (!isAdmin) return;
    const name = teamName.trim();
    if (!name) return;
    setSavingTeam(true);
    setError("");
    try {
      await updateTeamName(team.id, name);
      setEditingTeamName(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "チーム名の変更に失敗しました");
    }
    setSavingTeam(false);
    router.refresh();
  };

  const handleToggleRole = async (userId: string, currentRole: UserRole) => {
    if (!isAdmin) return;
    const newRole: UserRole = currentRole === "admin" ? "member" : "admin";
    setUpdatingUserId(userId);
    setError("");
    try {
      await toggleUserRole(userId, newRole);
    } catch (e) {
      setError(e instanceof Error ? e.message : "権限の変更に失敗しました");
    }
    setUpdatingUserId(null);
    router.refresh();
  };

  const handleKickUser = async (userId: string, username: string) => {
    if (!isAdmin) return;
    if (!confirm(`${username} をチームから除外しますか？`)) return;
    setUpdatingUserId(userId);
    setError("");
    try {
      await kickUser(userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ユーザーの除外に失敗しました");
    }
    setUpdatingUserId(null);
    router.refresh();
  };

  const handleLeaveTeam = async () => {
    if (!confirm("チームから脱退しますか？この操作は取り消せません。")) return;
    setLeavingTeam(true);
    setError("");
    const supabase = createClient();
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", currentProfile.id);
    if (profileError) { setError("脱退処理に失敗しました"); setLeavingTeam(false); return; }
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* チーム名 */}
      <div className="space-y-1.5">
        <Label className="text-sm text-muted-foreground">チーム名</Label>
        {isAdmin && editingTeamName ? (
          <div className="space-y-2 sm:space-y-0 sm:flex sm:gap-2">
            <Input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="h-8 w-full sm:max-w-xs"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSaveTeamName()}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveTeamName} disabled={savingTeam || !teamName.trim()}>
                {savingTeam ? "保存中..." : "保存"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setTeamName(team.name); setEditingTeamName(false); }}>
                キャンセル
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{team.name}</span>
            {isAdmin && (
              <button onClick={() => setEditingTeamName(true)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="チーム名を編集">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ユーザー一覧 */}
      <div className="space-y-1.5">
        <Label className="text-sm text-muted-foreground">ユーザー（{users.length}人）</Label>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">ユーザーがいません</p>
        ) : (
          <div className="rounded-md border border-border divide-y divide-border">
            {users.map((user) => {
              const isCurrentUser = user.id === currentProfile.id;
              const isUpdating = updatingUserId === user.id;
              return (
                <div key={user.id} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {user.username}
                      {isCurrentUser && <span className="text-muted-foreground ml-1">(自分)</span>}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${user.role === "admin" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {user.role === "admin" ? "管理者" : "メンバー"}
                    </span>
                  </div>
                  {isAdmin && !isCurrentUser && (
                    <div className="flex items-center gap-2 sm:gap-1">
                      <button
                        onClick={() => handleToggleRole(user.id, user.role)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        aria-label={user.role === "admin" ? "メンバーに変更" : "管理者に変更"}
                        title={user.role === "admin" ? "メンバーに変更" : "管理者に変更"}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Spinner className="h-3.5 w-3.5" />
                        ) : user.role === "admin" ? (
                          <ShieldOff className="h-3.5 w-3.5" />
                        ) : (
                          <Shield className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleKickUser(user.id, user.username)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        aria-label={`${user.username}を除外`}
                        title="チームから除外"
                        disabled={isUpdating}
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
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
          disabled={leavingTeam}
        >
          {leavingTeam ? <Spinner className="h-4 w-4 mr-2" /> : <LogOut className="h-4 w-4 mr-2" />}
          {leavingTeam ? "脱退中..." : "チームから脱退"}
        </Button>
      </div>
    </div>
  );
}
