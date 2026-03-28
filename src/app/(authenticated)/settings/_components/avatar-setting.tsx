"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, Pencil } from "lucide-react";

const SUPABASE_URL = "https://aaomqtwvwkvmyjdctrue.supabase.co";

export function AvatarSetting({ profileId, currentAvatar, username }: { profileId: string; currentAvatar: string | null; username: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentAvatar);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(username);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("画像ファイルを選択してください");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("ファイルサイズは2MB以下にしてください");
      return;
    }

    setAvatarError("");
    setUploading(true);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${profileId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setAvatarError("アップロードに失敗しました: " + uploadError.message);
      setUploading(false);
      return;
    }

    const avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar: avatarUrl }).eq("id", profileId);
    setPreview(avatarUrl);
    setUploading(false);
    router.refresh();
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    const supabase = createClient();
    await supabase.from("profiles").update({ avatar: null }).eq("id", profileId);
    setPreview(null);
    setUploading(false);
    router.refresh();
  };

  const handleSaveName = async () => {
    const name = nameValue.trim();
    if (!name) return;
    setSavingName(true);
    setNameError("");
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ username: name }).eq("id", profileId);
    if (error) setNameError("名前の変更に失敗しました");
    else setEditingName(false);
    setSavingName(false);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {/* アバター */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/15 overflow-hidden flex items-center justify-center shrink-0">
          {preview ? (
            <img src={preview} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-medium">{nameValue[0]?.toUpperCase() ?? "?"}</span>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4 mr-1" />
              {uploading ? "アップロード中..." : "写真を選択"}
            </Button>
            {preview && (
              <Button size="sm" variant="outline" onClick={handleRemoveAvatar} disabled={uploading} className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1" />
                削除
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">JPG・PNG・GIF・WebP、2MB以下</p>
          {avatarError && <p className="text-xs text-destructive">{avatarError}</p>}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {/* ユーザー名 */}
      <div className="space-y-1.5">
        <Label className="text-sm text-muted-foreground">名前</Label>
        {editingName ? (
          <div className="flex gap-2">
            <Input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="h-8 max-w-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") { setNameValue(username); setEditingName(false); }
              }}
            />
            <Button size="sm" onClick={handleSaveName} disabled={savingName || !nameValue.trim()}>
              {savingName ? "保存中..." : "保存"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setNameValue(username); setEditingName(false); }}>
              キャンセル
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{nameValue}</span>
            <button onClick={() => setEditingName(true)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="名前を編集">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {nameError && <p className="text-xs text-destructive">{nameError}</p>}
      </div>
    </div>
  );
}
