"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { Title } from "@/lib/types";
import { modeLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** 作品は運営側の固定プリセットのため、ここでは一覧表示と既定作品の切り替えのみ行う */
export function TitleManager({ titles, isAdmin }: { titles: Title[]; isAdmin: boolean }) {
  const [defaultingId, setDefaultingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState("");
  const router = useRouter();

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
    <div className="space-y-3">
      {mutationError ? <p className="text-sm text-destructive">{mutationError}</p> : null}

      <div className="space-y-1">
        {titles.map((t) => (
          <div key={t.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
            {isAdmin ? (
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
                  <Star className={cn("h-4 w-4", t.is_default ? "fill-star text-star" : "text-muted-foreground")} />
                )}
              </Button>
            ) : null}
            <span className="text-sm flex-1">
              {t.name}
              <span className="ml-2 text-xs text-muted-foreground">{modeLabel[t.third_mode]}</span>
              {t.is_default ? <span className="ml-2 text-xs text-muted-foreground">既定</span> : null}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        作品は運営側で用意したものを使用します。{isAdmin ? "★で既定の作品（初回表示時の作品）を切り替えられます。" : ""}
      </p>
    </div>
  );
}
