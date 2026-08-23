"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Pencil, Check, X, Star } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { Title } from "@/lib/types";

export function TitleManager({ titles, teamId, isAdmin }: { titles: Title[]; teamId: string; isAdmin: boolean }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [defaultingId, setDefaultingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState("");
  const router = useRouter();

  const startEdit = (t: Title) => {
    setEditingId(t.id);
    setEditName(t.name);
  };

  const cancelEdit = () => setEditingId(null);

  const handleSave = async (t: Title) => {
    if (!isAdmin || !editName.trim()) return;
    setSavingId(t.id);
    setMutationError("");
    const supabase = createClient();
    const { error } = await supabase.from("titles").update({ name: editName.trim() }).eq("id", t.id).eq("team_id", teamId);
    if (error) { setMutationError("更新に失敗しました"); setSavingId(null); return; }
    setSavingId(null);
    setEditingId(null);
    router.refresh();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !name.trim()) return;
    setLoading(true);
    setMutationError("");
    const supabase = createClient();
    const { error } = await supabase
      .from("titles")
      .insert({ name: name.trim(), team_id: teamId, is_default: titles.length === 0 });
    if (error) { setMutationError("追加に失敗しました"); setLoading(false); return; }
    setName("");
    setLoading(false);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin || titles.length <= 1) return;
    if (!confirm("この作品を削除しますか？（試合データが登録されている場合は削除できません）")) return;
    setDeletingId(id);
    setMutationError("");
    const supabase = createClient();
    const { error } = await supabase.from("titles").delete().eq("id", id).eq("team_id", teamId);
    if (error) {
      setMutationError("この作品には試合データが登録されているため削除できません");
      setDeletingId(null);
      return;
    }
    router.refresh();
    setDeletingId(null);
  };

  const handleSetDefault = async (id: string) => {
    if (!isAdmin) return;
    setDefaultingId(id);
    setMutationError("");
    const supabase = createClient();
    // set_default_title RPC が「既存デフォルトの解除→対象をON」を1トランザクションで原子的に処理する
    const { error } = await supabase.rpc("set_default_title", { p_title_id: id });
    if (error) { setMutationError("既定の設定に失敗しました"); setDefaultingId(null); return; }
    router.refresh();
    setDefaultingId(null);
  };

  return (
    <div className="space-y-4">
      {mutationError && <p className="text-sm text-destructive">{mutationError}</p>}

      {isAdmin && (
        <form onSubmit={handleAdd} className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              placeholder="作品名（例: Black Ops 6）"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />} 追加
          </Button>
        </form>
      )}

      {titles.length === 0 ? (
        <p className="text-sm text-muted-foreground">作品が登録されていません</p>
      ) : (
        <div className="space-y-1">
          {titles.map((t) => (
            <div key={t.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
              {isAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => handleSetDefault(t.id)}
                  disabled={defaultingId === t.id || t.is_default}
                  aria-label={t.is_default ? "既定の作品" : "既定に設定"}
                >
                  {defaultingId === t.id ? (
                    <Spinner />
                  ) : (
                    <Star className={`h-4 w-4 ${t.is_default ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                  )}
                </Button>
              )}
              {editingId === t.id ? (
                <>
                  <Input
                    className="h-7 text-sm flex-1"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSave(t)} disabled={savingId === t.id}>
                    {savingId === t.id ? <Spinner /> : <Check className="h-4 w-4 text-green-500" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm flex-1">
                    {t.name}
                    {t.is_default && <span className="ml-2 text-xs text-muted-foreground">既定</span>}
                  </span>
                  {isAdmin && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id || titles.length <= 1}
                      >
                        {deletingId === t.id ? <Spinner /> : <Trash2 className="h-4 w-4" />}
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
