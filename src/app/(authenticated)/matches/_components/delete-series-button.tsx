"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useAction } from "@/lib/use-action";
import { deleteSeries } from "../actions";

export function DeleteSeriesButton({ id }: { id: string }) {
  const { pendingKey, error, run } = useAction();
  const loading = pendingKey !== null;

  const handleDelete = () => {
    if (!confirm("このシリーズを削除しますか？（関連するゲーム・スタッツも削除されます）")) return;
    run("delete", () => deleteSeries(id));
  };

  return (
    <>
      <Button size="icon" variant="ghost" onClick={handleDelete} disabled={loading} aria-label="対戦を削除">
        {loading ? <Spinner /> : <Trash2 className="h-4 w-4" />}
      </Button>
      {error ? <span role="alert" className="text-xs text-destructive">{error}</span> : null}
    </>
  );
}
