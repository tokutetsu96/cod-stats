"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { TeamInvite } from "@/lib/types";
import { createInvite, deleteInvite } from "../actions";

const EXPIRY_OPTIONS = [
  { days: 1, label: "1日" },
  { days: 7, label: "7日" },
  { days: 30, label: "30日" },
] as const;

const MAX_USES_OPTIONS = [
  { value: "1", label: "1回" },
  { value: "5", label: "5回" },
  { value: "", label: "無制限" },
] as const;

// サーバー/クライアントで同じ表示になるようタイムゾーンを固定する
const expiryFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** ABCD2345EFGH → ABCD-2345-EFGH（入力時のハイフンはDB側で除去される） */
function formatCode(code: string) {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

export function InviteManager({ invites }: { invites: TeamInvite[] }) {
  const router = useRouter();
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [maxUses, setMaxUses] = useState<string>("1");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleCreate = () => {
    setError("");
    startTransition(async () => {
      const result = await createInvite(expiresInDays, maxUses ? Number(maxUses) : null);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  };

  const handleDelete = (invite: TeamInvite) => {
    if (!confirm(`招待コード ${formatCode(invite.code)} を削除しますか？このコードでは参加できなくなります。`)) return;
    setError("");
    setPendingId(invite.id);
    startTransition(async () => {
      const result = await deleteInvite(invite.id);
      if (result.ok) router.refresh();
      else setError(result.error);
      setPendingId(null);
    });
  };

  const handleCopy = async (invite: TeamInvite) => {
    await navigator.clipboard.writeText(formatCode(invite.code));
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId((id) => (id === invite.id ? null : id)), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="invite-expiry" className="text-xs text-muted-foreground">有効期限</Label>
          <Select
            id="invite-expiry"
            className="h-8 w-24"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(Number(e.target.value))}
          >
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.days} value={o.days}>{o.label}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="invite-max-uses" className="text-xs text-muted-foreground">使用回数</Label>
          <Select
            id="invite-max-uses"
            className="h-8 w-24"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
          >
            {MAX_USES_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
        <Button size="sm" className="h-8" onClick={handleCreate} disabled={isPending}>
          {isPending && !pendingId ? "発行中..." : "招待コードを発行"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {invites.length === 0 ? (
        <p className="text-sm text-muted-foreground">有効な招待コードはありません</p>
      ) : (
        <div className="rounded-md border border-border divide-y divide-border">
          {invites.map((invite) => (
            <div key={invite.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <code className="bg-muted px-2 py-0.5 rounded text-sm tracking-wider">{formatCode(invite.code)}</code>
                <button
                  onClick={() => handleCopy(invite)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label="招待コードをコピー"
                >
                  {copiedId === invite.id ? <Check className="h-3.5 w-3.5 text-win" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{expiryFormatter.format(new Date(invite.expires_at))} まで</span>
                <span>
                  {invite.use_count}/{invite.max_uses ?? "∞"} 回
                </span>
                <button
                  onClick={() => handleDelete(invite)}
                  className="hover:text-destructive transition-colors p-1"
                  aria-label="招待コードを削除"
                  disabled={pendingId === invite.id}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
