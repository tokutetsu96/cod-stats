"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyTeamId({ teamId }: { teamId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(teamId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-sm">チームID:</span>
      <code className="bg-muted px-2 py-0.5 rounded text-xs">{teamId}</code>
      <button
        onClick={handleCopy}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="チームIDをコピー"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      {copied && <span className="text-xs text-green-500">コピーしました</span>}
      <span className="text-xs text-muted-foreground">（メンバー招待時に共有）</span>
    </div>
  );
}
